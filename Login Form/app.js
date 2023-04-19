const express = require('express')
const app = express()
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


app.get('/login',(req,res)=>{
    res.render('login',{messages:req.flash()})
})

app.post('/login',(req,res)=>{
   const username = req.body.username;
   const password = req.body.password;

   if(username == "fawaz123" && password =="m@hAmmed12")  req.flash('success', 'Login Successfull');
   else req.flash('error', 'invalid username and password');
  res.render('login',{messages:req.flash()})

})

app.get('/forget',(req,res)=>{
    res.render('forgotPass',{messages:req.flash()})
})

app.post('/forget',(req,res)=>{
  const password1 = req.body.password1;
  const password2 = req.body.password2;

  if(password1 === password2)  {req.flash('success', 'Password Changed Successfull'); res.redirect('/login');}
  else {req.flash('error', 'New Password and Confirm Password is Different'); res.redirect('/forget')}
 res.render('test',{messages:req.flash()})

})


app.listen(5000,(req,res)=>{
    console.log("listening of port 5000")
})

