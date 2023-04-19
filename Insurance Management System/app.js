

const express = require('express')
const app = express()
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');

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
  database: 'insurance'
});

app.get('/',authenticatedCheck,(req,res)=>{
    res.render('home',{body:'',title:"Home",messages:req.flash()})
})


app.get('/login',authenticatedCheck,(req,res)=>{
    res.render('login',{body:'',title:"Login",messages:req.flash()})
})

app.get('/register',authenticatedCheck,(req,res)=>{
    res.render('register',{body:"",title:"Register",messages:req.flash()})
})


app.post('/register',authenticatedCheck, function(req, res) {
    // Get the customer information from the request body
    const { name, email_address, phone_number, password } = req.body;
  
    // Check if the username already exists in the database
    const checkSql = 'SELECT * FROM customer WHERE email_address = ?';
    connection.query(checkSql, [email_address], function(checkErr, checkResult) {
      if (checkErr) throw checkErr;
      if (checkResult.length > 0) {
        req.flash('error', 'User with the same email already exists!');
        res.redirect('/register');
      } else {
        // Insert the customer data into the MySQL database
        const insertSql = 'INSERT INTO customer (name, email_address, phone_number, password) VALUES (?, ?, ?, ?)';
        connection.query(insertSql, [name, email_address, phone_number, password], function(insertErr, insertResult) {
          if (insertErr) throw insertErr;
          req.flash('success', 'Customer added successfully!');
          res.redirect('/login');
        });
      }
    });
});



app.post('/login',authenticatedCheck, (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM customer WHERE email_address = ?';
    
    if(email ==='admin@gmail.com' && password==='admin'){
      req.flash('success', 'Welcome to Admin Page');
      req.session.email='admin@gmail.com';
      req.session.pass='admin';
      res.redirect('/admin/home')
    }
    else{
    // Check if user exists in the database
    connection.query(sql, [email], (error, results) => {
      if (error) {
        req.flash('error', 'Invalid email or password');
        console.log(email,password,results)
        res.redirect('/login')
        return;
      }
      
      if (results.length === 0) {
        req.flash('error', 'Invalid email or password');
        res.redirect('/login')
      } else {
        // Verify password
        if (results[0].password !== password) {
          req.flash('error', 'Invalid email or password');
          res.redirect('/login')
        } else {
          req.session.customer = results[0].customer_id;
          req.flash('success', 'Welcome Back!');
          res.redirect('/user/home');
        }
      }
    });
  }});
  
  app.get('/user/home',authenticated,(req,res)=>{
    res.render('userHome',{body:"",title:"User Home",messages:req.flash()})
})

  app.get('/purchase/policy',authenticated,(req,res)=>{
    res.render('policyPurchase',{body:"",title:"Policy Purchase",messages:req.flash()})
})


app.post('/purchase/policy',authenticated, function(req, res) {
  // Get the policy information from the request body
  const { policy_type, insured_item, coverage_amount, payment_method, customer_id } = req.body;

  // Insert the policy data into the MySQL database
  const sql = 'INSERT INTO policy_purchased (policy_type, insured_item, coverage_amount, payment_method, customer_id) VALUES (?, ?, ?, ?, ?)';
  connection.query(sql, [policy_type, insured_item, coverage_amount, payment_method, customer_id], function(err, result) {
    if (err) throw err;
    req.flash("success","Policy Purchased Successfull")
    res.redirect('/purchase/policy');
  });
});

app.get('/claim/policy',authenticated,(req,res)=>{
    res.render('claims',{body:"",title:"claims",messages:req.flash()})
})


// Route to handle claim insertion form submission
app.post('/claim/policy',authenticated, (req, res) => {
    const { claim_status, claim_date, claim_description, policy_id, customer_id } = req.body;
  
    // Insert new claim into database
    connection.query('INSERT INTO claims SET ?', {
      claim_status,
      claim_date,
      claim_description,
      policy_id,
      customer_id
    }, (err, results) => {
      if (err) throw err;
  
      // Redirect to claims list
      req.flash("success","Insurance Claimed")
      res.redirect('/claim/policy');
    });
  });

app.get('/admin/home',isAdmin,(req,res)=>{
    res.render('adminHome',{body:'',title:"Admin Home",messages:req.flash()})
  })

  app.get('/add/policy',isAdmin,(req,res)=>{
    res.render('addPolicy',{body:'',title:"Add Policy",messages:req.flash()})
  })

  app.post('/add/policy',isAdmin, (req, res) => {
    const policy_type = req.body.policy_type;
    const insured_item = req.body.insured_item;
    const coverage_amount = req.body.coverage_amount;
    const sql = 'INSERT INTO policy (policy_type, insured_item, coverage_amount) VALUES (?, ?, ?)';
    connection.query(sql, [policy_type, insured_item, coverage_amount], (err, result) => {
      if (err) throw err;
      console.log('Policy inserted!');
      req.flash("success","Policy Purchased successfully")
      res.redirect('/add/policy');
    });
  });
  
  app.get('/edit/:id',isAdmin, (req, res) => {
    const policy_id = req.params.id;
    const sql = 'SELECT * FROM policy WHERE policy_id = ?';
    connection.query(sql, [policy_id], (err, result) => {
      if (err) throw err;
      res.render('updatePolicy', { policy: result[0],body:'',title:"Edit Policy",messages:req.flash() });
    });
  });
  
  app.post('/update/:id',isAdmin,(req, res) => {
    const policy_id = req.params.id;
    const policy_type = req.body.policy_type;
    const insured_item = req.body.insured_item;
    const coverage_amount = req.body.coverage_amount;
    const sql = 'UPDATE policy SET policy_type = ?, insured_item = ?, coverage_amount = ? WHERE policy_id = ?';
    connection.query(sql, [policy_type, insured_item, coverage_amount, policy_id], (err, result) => {
      if (err) throw err;
      req.flash("success",'Policy updated!');
      res.redirect('/manage/policy');
    });
  });

  // Route to handle policy deletion
app.post('/policies/delete/:id', (req, res) => {
    const policyId = req.params.id;
  
    // Delete policy from database
    connection.query('DELETE FROM policy WHERE policy_id = ?', policyId, (err, results) => {
      if (err) throw err;
  
      // Redirect back to policies list
      req.flash("success","Policy Deleted Successfully")
      res.redirect('/manage/policy');
    });
  });

  app.get('/all/claims',isAdmin, (req, res) => {
    connection.query('SELECT * FROM claims', (error, results) => {
      if (error) throw error;
      res.render('allClaims', { claims: results,body:'',title:"All Claims",messages:req.flash() });
    });
  });
  
  app.get('/all/customers',isAdmin, (req, res) => {
    const query = 'SELECT * FROM customer';
    connection.query(query, (err, results) => {
      if (err) {
        req.flash("error",'Error fetching customers:');
        return;
      }
      // Render the customers view with the results
      res.render('allCustomers', { customers: results,title:"All Customer",body:'',messages:req.flash()  });
    });
  });
  
  app.post('/customers/:id',isAdmin, (req, res) => {
    const query = 'DELETE FROM customer WHERE customer_id = ?';
    const customerId = req.params.id;
    connection.query(query, [customerId], (err, result) => {
      if (err) {
        req.flash('error','Error deleting customer:');
        return;
      }
      req.flash("success",`Deleted customer with ID ${customerId}`);
      res.redirect('/all/customers');
    });
  });
  
  app.get('/manage/policy', (req, res) => {
    // Query to select all policies from the policy table
    const sql = 'SELECT * FROM policy';
  
    // Execute the query and render the result in an HTML table
    connection.query(sql, (err, results) => {
      if (err) throw err;
  
      res.render('allPolicies', { policies: results,title:"All Policies",body:'',messages:req.flash() });
    });
  });

  function isAdmin(req, res, next){
    if (req.session.email==='admin@gmail.com') {
      // User is logged in, proceed to the next middleware or route handler
      next();
    } else {
      // User is not logged in, redirect to login page or send an error response
      res.redirect('/login');
    }
  };



function authenticated(req, res, next){
    if (req.session.customer) {
      // User is logged in, proceed to the next middleware or route handler
      next();
    } else {
      // User is not logged in, redirect to login page or send an error response
      res.redirect('/login');
    }
  };

  function authenticatedCheck(req, res, next){
    if (!req.session.customer) {
      // User is logged in, proceed to the next middleware or route handler
      next();
    } else {
      // User is not logged in, redirect to login page or send an error response
      res.redirect('/user/home');
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