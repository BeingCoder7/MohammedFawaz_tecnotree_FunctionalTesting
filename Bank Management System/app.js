const express = require('express');
const app = express();
const mysql = require('mysql');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const session = require('express-session');

app.set('view engine', 'ejs');
app.use(flash());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'my-secret-key',
    resave: false,
    saveUninitialized: true
  }));


const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'fawaz123',
  database: 'bank'
});

app.get('/',authenticatedCheck,(req,res)=>{
    res.render('home')
})

app.get('/login',authenticatedCheck,(req,res)=>{
    res.render('login',{messages:req.flash()})
})

app.post('/login',authenticatedCheck, (req, res) => {
    const { username, password } = req.body;
  
    // query the database to find the matching username and password
    connection.query(`SELECT * FROM accountholder WHERE username = '${username}' AND password = '${password}'`, (err, results) => {
      if (err) {
        console.error(err);
        // handle the error
      } else if (results.length === 0) {
        req.flash("error", "Invalid username or password");
        res.redirect('/login');
      } else {
        // add the user information to the session
        req.session.username = results[0].username;
        req.session.name = results[0].account_holder_name;
        req.session.email = results[0].email;
        req.session.account_type = results[0].account_type;
        req.session.account_number = results[0].account_number;
        req.session.balance = results[0].balance;
  
        // redirect to the profile page
        req.flash("success", "Login Successfull");
        res.redirect('/profile');
      }
    });
  });
  

app.get('/register',authenticatedCheck,(req,res)=>{
    res.render('register',{messages:req.flash()})
})



app.post('/register',authenticatedCheck, (req, res) => {

    const { name, email, address, type, phone, username, password } = req.body;
    console.log(req.body)
  
    // // validate form values
    // if (!name || !email || !address || !account_type || !username || !password || !phone) {
    //   req.flash("error", "Please fill all the fields")
    //   return res.redirect('/register')
    // }
  
    let minm = 1000000;
    let maxm = 9999999;
    account_number = Math.floor(Math.random() * (maxm - minm + 1)) + minm;
    let balance = 0
    let sql = `INSERT INTO accountholder VALUES (${account_number}, '${name}', '${email}', '${password}', '${type}', ${balance}, '${username}','${address}','${phone}')`;
  
    // insert new account holder into database
    connection.query(sql,
      (err) => {
        if (err) {
          console.error(err);
          // handle the error
          req.flash("error", "An error occurred while opening the account")
          return res.redirect('/register');
        } else {
          req.flash("success", "Account Opened Successfully")
          return res.redirect('/login');
        }
      }
    );
  });
  

app.get('/profile',authenticated,(req,res)=>{
let sql = 'SELECT * FROM transaction';
	connection.query(sql, (err, transactions) => {
		if (err) throw err;
        res.render('profile',{messages:req.flash(),username:req.session.name,balance:req.session.balance,transactions:transactions,account_number:req.session.account_number})
	});
})

app.post('/add/amount',authenticated, (req, res) => {
    const amount = parseInt(req.body.amount); // Parse amount as integer
    const accountNumber = req.session.account_number; // Get account number from session
    let sql = `UPDATE accountholder SET balance = balance + ${amount} WHERE account_number = ${accountNumber}`;
    connection.query(sql, (err, result) => {
        if (err) {
            console.error(err);
            req.flash("error", "An error occurred while adding the amount"); // Set error message
        } else {
            req.flash("success", "Amount added successfully"); // Set success message
            req.session.balance += amount; // Update session balance
        }
        res.redirect('/profile'); // Redirect to profile page
    });
});


app.post('/withdraw',authenticated, (req, res) => {
    const amount = parseInt(req.body.amount); // Parse amount as integer
    const accountNumber = req.session.account_number; // Get account number from session
    let sql = `UPDATE accountholder SET balance = balance - ${amount} WHERE account_number = ${accountNumber}`;
    let newBalance = req.session.balance - amount;
    if (newBalance < 0) {
        req.flash("error", "Insufficient balance"); // Set error message
        res.redirect('/profile'); // Redirect to profile page
    } else {
        connection.query(sql, (err, result) => {
            if (err) {
                console.error(err);
                req.flash("error", "An error occurred while withdrawing the amount"); // Set error message
            } else {
                req.session.balance -= amount;
                req.flash("success", "Amount withdrawn successfully"); // Set success message
            }
            res.redirect('/profile'); // Redirect to profile page
        });
    }
});

  
app.post('/transfer',authenticated, (req, res) => {
    const amount = parseFloat(req.body.amount);
    const to = parseInt(req.body.to);
    const from = req.session.account_number;
    
    // Check if the user is transferring to their own account
    if (to === from) {
        req.flash("error", "Cannot transfer to your own account");
        return res.redirect('/profile');
    }

    // Check if the user has enough balance to transfer
    if (amount > req.session.balance) {
        req.flash("error", "Insufficient balance");
        return res.redirect('/profile');
    }
    
    // Check if the recipient's account exists
    let sql = `SELECT * FROM accountholder WHERE account_number = ${to}`;
    connection.query(sql, (err, result) => {
        if (err) {
            console.error(err);
            req.flash("error", "An error occurred while transferring the amount");
            return res.redirect('/profile');
        }
        if (result.length === 0) {
            req.flash("error", "Recipient's account does not exist");
            return res.redirect('/profile');
        }
        
        // Transfer the amount
        let senderSql = `UPDATE accountholder SET balance = balance - ${amount} WHERE account_number = ${from}`;
        let receiverSql = `UPDATE accountholder SET balance = balance + ${amount} WHERE account_number = ${to}`;
        let transactionSql = `INSERT INTO transaction (sender_account_number, reciver_account_number, deposit) VALUES (${from}, ${to}, ${amount})`;
        
        connection.beginTransaction(function(err) {
            if (err) {
                console.error(err);
                req.flash("error", "An error occurred while transferring the amount");
                return res.redirect('/profile');
            }
            
            connection.query(senderSql, function(err, result) {
                if (err) {
                    console.error(err);
                    connection.rollback(function() {
                        req.flash("error", "An error occurred while transferring the amount");
                        return res.redirect('/profile');
                    });
                }
                
                connection.query(receiverSql, function(err, result) {
                    if (err) {
                        console.error(err);
                        connection.rollback(function() {
                            req.flash("error", "An error occurred while transferring the amount");
                            return res.redirect('/profile');
                        });
                    }
                    
                    connection.query(transactionSql, function(err, result) {
                        if (err) {
                            console.error(err);
                            connection.rollback(function() {
                                req.flash("error", "An error occurred while transferring the amount");
                                return res.redirect('/profile');
                            });
                        }
                        
                        connection.commit(function(err) {
                            if (err) {
                                console.error(err);
                                connection.rollback(function() {
                                    req.flash("error", "An error occurred while transferring the amount");
                                    return res.redirect('/profile');
                                });
                            }
                            
                            req.session.balance -= amount;
                            req.flash("success", "Amount transferred successfully");
                            return res.redirect('/profile');
                        });
                    });
                });
            });
        });
    });
});


function authenticated(req, res, next){
    if (req.session.account_number) {
      // User is logged in, proceed to the next middleware or route handler
      next();
    } else {
      // User is not logged in, redirect to login page or send an error response
      res.redirect('/login');
    }
  };

  function authenticatedCheck(req, res, next){
    if (!req.session.account_number) {
      // User is logged in, proceed to the next middleware or route handler
      next();
    } else {
      // User is not logged in, redirect to login page or send an error response
      res.redirect('/profile');
    }
  };



app.get('/logout', function(req, res) {
    req.session.destroy(function(err) {
      if (err) {
        console.error(err);
      } else {
        res.redirect('/');
      }
    });
  });




app.listen(3000,(req,res)=>{
    console.log("listening of port 3000")
})

