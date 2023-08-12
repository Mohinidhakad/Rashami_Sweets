const express=require('express');
const ejs=require('ejs');
const crypto=require('crypto');
const alert = require('alert');
const bodyparser=require('body-parser');
const multer=require('multer');
const path=require('path');
const app=express();
const mongoose=require('mongoose');


var preproductid="132318163";
var preuserid="1218";
var secret_key = 'password';
var secret_iv= 'a372l'

ecnryption_method='aes256';
const key = crypto
  .createHash('sha512')
  .update(secret_key)
  .digest('hex')
  .substring(0, 32)
const encryptionIV = crypto
  .createHash('sha512')
  .update(secret_iv)
  .digest('hex')
  .substring(0, 16)

// Encrypt data
 function encryptData(data) {
  const cipher = crypto.createCipheriv(ecnryption_method, key, encryptionIV)
  return Buffer.from(
    cipher.update(data, 'utf8', 'hex') + cipher.final('hex')
  ).toString('base64') // Encrypts data and converts to hex and base64
}

// Decrypt data
 function decryptData(encryptedData) {
  const buff = Buffer.from(encryptedData, 'base64')
  const decipher = crypto.createDecipheriv(ecnryption_method, key, encryptionIV)
  return (
    decipher.update(buff.toString('utf8'), 'hex', 'utf8') +
    decipher.final('utf8')
  ) // Decrypts data and converts to utf8
}

mongoose.connect("mongodb://127.0.0.1:27017/ShopDB")
const productSchema=new mongoose.Schema({
    name:String,
    description:String,
    price:Number,
    category:String,
    availability:String,
    bestseller:String,
    shelf_life:Number,
    pro_id:String,
});

const messageSchema=new mongoose.Schema({
    name:String,
    email:String,
    subject:String,
    message:String
});

const userSchema=new mongoose.Schema({
    name:String,
    email:String,
    pass:String,
    user_id:String
});

const cartSchema=new mongoose.Schema({
   user_id:String,
   product:[{
    name: String,
    price: Number,
    pro_id : String,
    quantity : Number,
    SubTotal : Number,
     }],
});
const Message=mongoose.model('Message' ,messageSchema);
const User=mongoose.model('User',userSchema);
const Product=mongoose.model('Product',productSchema);
const Cart=mongoose.model('Cart',cartSchema);
app.set('view engine','ejs');
app.use(bodyparser.urlencoded({extended:false}));
app.use(express.static('Images'));
app.use(express.static("public"));


const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,'Images/products')
    },
    filename:(req,file,cb)=>{
      
        Product.count({}, function( err, count){
            var productid=preproductid+count;
            cb(null,productid+path.extname(file.originalname));
        })

        
    }
})

const upload=multer({storage:storage});

// Navbar
app.get("/", function(req,res){
res.redirect("/user/unknown");
});
app.get("/user/:user_id",function(req,res){
    const user_id= req.params.user_id;
    
    Product.find({bestseller:"Yes"},function(err,products){
    
        if(req.params.user_id === "unknown"){
             logbtntext="Login";
            }
            else{
             logbtntext="Log Out";
            }
        console.log(err);
        res.render("index",{products:products,user_id:user_id,logbtn:logbtntext});
    });
   
});

app.get("/insertproduct",function(req,res){
    res.render("product_form",{});
    });


    app.get("/product/:pro_id/user/:user_id",function(req,res){
         console.log("'"+req.params.pro_id+"'");
     Product.findOne({pro_id:req.params.pro_id},function(err,product){
        console.log("Product"+product);
      res.render("product",{product:product,user_id:req.params.user_id});
     });
    });


    app.get("/shop/user/:user_id",function(req,res){
        if(req.params.user_id=="unknown"){
             logbtn="Login";
            }
            else{
                 logbtn="Log Out";
            }
       const user_id= req.params.user_id;
        Product.find(function(err,products){
            res.render("shop",{products:products,user_id:user_id,logbtn:logbtn});
        });
    });
    app.get("/about/user/:user_id",function(req,res){
        if(req.params.user_id=="unknown"){
             logbtn="Login";
            }
            else{
                 logbtn="Log Out";
            }
        const user_id= req.params.user_id;
    res.render("about",{user_id:user_id,logbtn:logbtn});
    });
    app.get("/contact/user/:user_id",function(req,res){
        if(req.params.user_id=="unknown"){
            logbtn="Login";
            }
            else{
                 logbtn="Log Out";
            }
        const user_id= req.params.user_id;
    res.render("contact",{user_id:user_id,logbtn:logbtn});
    });



// Login/Sign Up

app.get("/losi",function(req,res){
res.render("losi",{});
});

app.post("/signup",function(req,res){
    User.findOne({email:req.body.email},function(err,user){
        if(user)
        {
            alert("Already Registered!");
        }
        else{
            User.count({}, function( err, count){
                var userid=preuserid+count;
                var enc_pass=encryptData(req.body.pass);
                var newuser= new User({ name: req.body.name,email:req.body.email,pass:enc_pass,user_id:userid });
                var newcart=new Cart({user_id:userid,product:[]});
                newcart.save(function(err){
                if(err) return console.error(err);
                console.log("Cart Registered");
                });
                newuser.save(function (err) {
                  if (err) return console.error(err);
                  alert("Successfully Registered!")
                });
            })
        }
    });
});


app.post("/login",function(req,res){
    User.findOne({email:req.body.email},function(err,user){
        if(user){
       if(req.body.pass === decryptData(user.pass)){
        res.redirect("/user/"+user.user_id);
       }
       else{
        alert("Wrong Password!")
       }
        }
       else{
        alert("Email is not Registered!")
       }
    });
  
});



// Cart
app.get("/cart/user/:user_id",function(req,res){
    if(req.params.user_id=="unknown"){
        logbtn="Login";
        res.redirect("/losi");
    }else{
        logbtn="Log Out";
        console.log("'"+req.params.user_id+"'");
        
    Cart.findOne({user_id:req.params.user_id},function(err,item){
        
        if (err) return console.error(err);
        if(item!= null){
            var total=0;
        item.product.forEach(element => {
            total=total+element.SubTotal;
        });   
        console.log(item);
        res.render("cart",{products:item.product,user_id:req.params.user_id,logbtn:logbtn,total:total});
    }
else{
    console.log("cart is null");
}
});
}
});

app.post("/cart/user/:user_id/:pro_id/update",function(req,res){
    Cart.findOne({user_id:req.params.user_id},function(err,cart){;
        const searchObject= cart.product.find((pro) => pro.pro_id==req.params.pro_id);
        searchObject.quantity=req.body.newq;
        searchObject.SubTotal=req.body.newq * searchObject.price;
        cart.save();
        res.redirect("/cart/user/"+req.params.user_id);
    });
});

app.get("/cart/user/:user_id/:pro_id/remove",function(req,res){
    Cart.findOne({user_id:req.params.user_id},function(err,cart){;
        cart.product.pull({pro_id:req.params.pro_id});
        cart.save();
        res.redirect("/cart/user/"+req.params.user_id);
    });
});

app.post("/product/:pro_id/user/:user_id/addtocart",function(req,res){
    if(req.params.user_id=="unknown"){
        logbtn="Login";
        res.redirect("/losi");
    }else{

Cart.findOne({user_id:req.params.user_id},function(err,cart){
    console.log("cart"+cart);
    const searchObject= cart.product.find((pro) => pro.pro_id==req.params.pro_id);
    if(searchObject){
        alert("Already in Cart!");
    }
    else{
        var SubTotal=(req.body.price)*(req.body.quantity);
        var newitem={name:req.body.name,price:req.body.price,pro_id:req.params.pro_id,quantity:req.body.quantity,SubTotal:SubTotal};
    cart.product.push(newitem);
    cart.save();
    res.redirect("/cart/user/"+req.params.user_id);
    }
});
}});

app.get("/checkout/user/:user_id",function(req,res){
    Cart.findOne({user_id:req.params.user_id},function(err,cart){;
        cart.product=[];
        cart.save();
        res.redirect("/cart/user/"+req.params.user_id);
    });
});


// Product Upload

   
app.post("/upload",upload.single('image'),function(req,res){
    Product.count({}, function( err, count){
        var productid=preproductid+count;
        var newproduct= new Product({ name: req.body.name,description:req.body.description, price: req.body.price,category:req.body.category,availability:req.body.availability,bestseller:req.body.bestseller,shelf_life:req.body.shelf_life,pro_id:productid });
        newproduct.save(function (err) {
          if (err) return console.error(err);
          console.log("done!")
        });
    });
   
    res.redirect("/");

});



// Contact Message

app.post("/message/user/:user_id",function(req,res){
var newmessage=new Message({name:req.body.name,email:req.body.email,subject:req.body.subject,message:req.body.message});
newmessage.save(function(err){
    if(err) console.error(err);
    alert("Message Sent");
});
res.redirect("/contact/user/"+req.params.user_id);
});



app.listen(3000,function(){
console.log("Server started");
});