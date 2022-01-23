// NodeJs webapp to shortern large URL to small links.

var express = require('express');
var path = require('path');
var valid_url = require('valid-url');
var crypto = require("crypto");
const qrcode = require('qrcode');
const { Client } = require('pg');
const util = require('util');
var bodyParser = require('body-parser');
var app = express();
var static = path.join(__dirname, 'static');
var format = /[!@#$%^&*()_+\=\[\]{};':"\\|,.<>\/?]+/;
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.set('view engine', 'ejs');

var domain = 'https://localhost:3000/'; //Place your domain here.

let loads = {
  host: 'localhost',
  port: 5432,
  user: '<USERNAME>', // replace your username
  password: '<PASSWORD>', // replace your password
  database:'<DATABASE-NAME>' // replace your database name
};


// Creating initial Database.
(async () => {
  var res ;
  const client = new Client(loads);
  client.connect();
  sql = `
  CREATE TABLE IF NOT EXISTS YOURLS(
    ID TEXT,
    URL TEXT,
    PRIMARY KEY(ID)
  );`;
  client.query(sql);
  console.log("Database ready!.")
})();


// function to execute querries in database.
async function executeQuerry(sql){ 
  var res;
  const client = new Client(loads);
  client.connect();
  await client.query(sql).then(result => res =  result.rows)
    .catch(e => console.error(e.stack))
    .then(() => client.end());
  return res;
};

// function to check string contains special characters.
function isContainSpecialCharacter(string){
  if(format.test(string)){
    return true;
  } else {
    return false;
  }
}

// function to check availablity of path in database.
async function checkAvailability(cpath){
  var sql = util.format("SELECT * FROM YOURLS WHERE ID = '%s';",cpath);
  var data = await executeQuerry(sql);
  if(data.length == 0) return false;
  else return true;
}


// function to valid url.
function ValidURL(str) {
  var regex = /(?:https?):\/\/(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;
  if(!regex .test(str)) {
    return false;
  } else {
    return true;
  }
}
 
// function to generate QRcode for url.
const generateQRCode = async text => { // QRCode 
  try {
    return await qrcode.toDataURL(text);
  } catch (err) {
    console.error(err)
  }
}

// Setting Router for home page.
app.get('/',async function(req, res) {  // Index page
    if(req.query.id != undefined){
        var img = await generateQRCode("https://yourls.me");
        res.render('after',{image:img});
    }else{
        res.render('index',{err:''});
    };
});

// Post response for home page.
app.post('/',async function(req,res){ 
  try{
      var url = req.body.url;
      url = url.replace(/^\s+|\s+$/gm,'');
      var cpath = req.body.cpath;
      cpath = cpath.replace(/^\s+|\s+$/gm,'')
      if(url == '') res.render('index',{err:'Link should not be empty.'});
      else if(!valid_url.isUri(url) && !ValidURL(url)) res.render('index',{err:'Please Enter valid url.'});
      else if(cpath.length < 5 && cpath != '') res.render('index',{err:'Custom path should be atleast 5 characters.'});
      else if(isContainSpecialCharacter(cpath)) res.render('index',{err:'Custom path must conatin [0-9][a-z][A-z][-].'});
      else {
        cpath = cpath.replace(' ','-');
        if(cpath == '') cpath = crypto.randomBytes(5).toString('hex');
        cpath = util.format("%s",cpath);
        if(!await checkAvailability(cpath)) {
            var sql = util.format("INSERT INTO YOURLS(ID,URL) VALUES('%s','%s')",cpath,url);
            await executeQuerry(sql);
            var img = await generateQRCode(domain+cpath);
            res.render('after',{image:img,url:domain+cpath});
        }
        else res.render('index',{err:'Path not available.'});
      }
  }catch(e){
    console.log(e);
    res.render('index',{err:'Bad requests.'});
  } 
})

// Redirecting websites for the further path.
app.get('/:cpath',async function(req,res){
  var cpath = req.params.cpath;
  if(await checkAvailability(cpath)){
    var sql = util.format("SELECT * FROM YOURLS WHERE ID = '%s';",cpath);
    var result = await executeQuerry(sql);
    res.redirect(result[0].url);
  }else res.redirect('/');
});

app.use('/static', express.static(static)); // setting static files.

app.listen(3000); // change port if already webapp running in this port.
