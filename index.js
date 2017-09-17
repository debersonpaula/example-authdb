//requirements
const express = require('express');
const session = require('express-session');
const mongodb = require('mongodb');
const path = require('path');
const bodyparser = require('body-parser');

//apps
const app = express();
const port = process.env.PORT || 3000;
const mongoClient = mongodb.MongoClient;

//user body parser
app.use(bodyparser.urlencoded({extended: true}));

//session initialization
app.use(session({
    secret: 'XS09-12nd-SoAp',
    resave: true,
    saveUninitialized: true
}));

// Authentication and Authorization Middleware
var auth = function(req, res, next) {
    if (req.session && req.session.logged === true)
        return next();
    else
        return res.sendStatus(401);
};

//router
app.get('/',function(req,res){
    showView('welcome.html',res);
});
app.get('/login',function(req,res){
    showView('login.html',res);
});
app.get('/logout',function(req,res){
    req.session.destroy();
    res.send('Sucessfully Logout. Go to <a href="/">main page.</a>');
});
app.get('/register',function(req,res){
    showView('register.html',res);
});
app.post('/register',function(req,res){
    registerUser(req,res,
        //done register
        function(){
            res.status(201);
            res.send('User registered sucessfully. Proceed to <a href="/home">home</a> page.')
        },
        //fail register
        function(){
            res.status(400);
            res.send('User already registered.');
        }
    );
});
app.post('/login',function(req,res){
    loginUser(req,res,
        //done login
        function(){
            res.redirect('/home');
        },
        //fail login
        function(){
            res.status(401);
            res.send('User/Password does not exists.');
        }
    );
});
app.get('/home',auth,function(req,res){
    res.send('<h3>Hello ' + req.session.username + ', welcome to your home page.' +
        '<p><a href="/logout">Logout</a></p>'
    );
});

//start server
app.listen(port, function (err) {
    if (err) {
      throw err;
    }
    console.log(`server is listening on ${port}...`);
});


//methods to handle file
function showView(view,res){
    res.sendFile(path.join(__dirname + '/views/' + view));
}

//method to register user
function registerUser(req,res,callbackDone,callbackFail){
    var username = req.body.username,
    userpass = req.body.userpass,
    userpass2 = req.body.userpass2;
    if (!username || !userpass || userpass != userpass2){
        res.send('User Name and Password fields cant be blank and Passwords should be the same.');
    }else{
        //connect to db
        mongoClient.connect("mongodb://localhost:27017/authlib",function(err,db){
            //if error throw exception
            if (err) throw err;
            
            //create collection if not exists
            db.createCollection('users');

            //get collection
            var users = db.collection('users');
            
            //find if users exists in collection
            users.findOne({username: username},function(err,result){
                if (err) throw err;
                //respond fail callback
                if (result){
                    db.close();
                    if (callbackFail) callbackFail();
                //or add new user to db
                }else{
                    var userdata = {username: username, userpass: userpass};
                    users.insertOne(userdata,function(err,result){
                        if (err) throw err;
                        db.close;
                        //after insert, create sessions
                        createSession(req,userdata);
                        if (callbackDone) callbackDone();
                    });
                }
            });
        });
    }
}

//method to register user in session
function createSession(req,userdata){
    req.session.username = userdata.username;
    req.session.userid = userdata._id;
    req.session.logged = true;
}

//method to log user
function loginUser(req,res,callbackDone,callbackFail){
    var username = req.body.username,
        userpass = req.body.userpass;
    if (!username || !userpass){
        res.send('User Name and Password fields cant be blank.');
    }else{
        //connect to db
        mongoClient.connect("mongodb://localhost:27017/authlib",function(err,db){
            //if error throw exception
            if (err) throw err;
            
            //create collection if not exists
            db.createCollection('users');

            //get collection
            var users = db.collection('users');
            
            //find if users exists in collection
            var userdata = {username: username, userpass: userpass};
            users.findOne(userdata,function(err,result){
                if (err) throw err;
                db.close();
                //respond fail callback
                if (!result){
                    if (callbackFail) callbackFail();
                //or add new user to db
                }else{
                    createSession(req,userdata);
                    if (callbackDone) callbackDone();
                }
            });
        });
    }
}