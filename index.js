const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();



//Middleware
app.use(cors());
app.use(express.json());


// JWT middleware
const verifyJWT = (req , res , next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'unauthorized access' });
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err , decoded) => {
    if(err){
      return res.status(401).send({error: true, message: 'unauthorized access' })
    }

    req.decoded = decoded;
    next();
  })
}






const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tb0uxuv.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("bistroDb").collection("users");
    const menuCollection = client.db("bistroDb").collection("menu");
    const reviewCollection = client.db("bistroDb").collection("reviews");
    const cartCollection = client.db("bistroDb").collection("carts");




    // APPLYING JSON WEB TOKEN FOR MORE SECURITY:
    app.post('/jwt', (req , res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
      res.send({token});

    })




  
    // Warning: use verifyJWT before using verifyAdmin

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }






    //gets all users
    app.get('/users' , verifyJWT, verifyAdmin, async (req , res)=> {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })







    // user info collect from ui in database related api
    app.post('/users', async(req,res)=>{
      const user = req.body;
      const query = {email: user.email}

      const existingUser =  await usersCollection.findOne(query);

      if(existingUser){
        return res.send({message: 'user already exist!'})
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });








    //secure to check is the email admin exist?

    app.get('/users/admin/:email' , verifyJWT, async(req , res )=> {
      const email = req.params.email;

      if(req.decoded.email !== email) {
        res.send({admin: false})
      }


      const query = {email: email}
      const user = await usersCollection.findOne(query);
      const result = {admin: user?.role === 'admin'}
      res.send(result);
    })








    // make an admin api
    app.patch('/users/admin/:id', async(req , res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const  result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    });






    //Load menu all menu data from mongoDB
    app.get('/menu', async(req, res) => {
        const result = await menuCollection.find().toArray();
        res.send(result);
    });




    // load all reviews data from reviews collection mongoDB
    app.get('/reviews', async(req, res) => {
        const result = await reviewCollection.find().toArray();
        res.send(result);
    });




    // Cart collection apis
    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(403).send({error: true, message: 'forbidden access' })
      }


      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });





    //all cart items
    app.post('/carts', async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });




    //Delete one item from the cart
    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




// middleware
app.use(cors());
app.use(express.json());


app.get('/' , (req , res) => {
    res.send('boss is sitting');
})

app.listen(port, () => {
    console.log(`Bistro Boss sitting on port ${port} `);
})




/**
 * ..................................................................
 * Naming Convention
 * ..................................................................
 * users : userCollection
 * app.get('/users'); use to get all user
 * app.get('/users/:id'); use to get particular user
 * app.post('/users'); use to create a user
 * app.patch('/users/:id'); use to particular id user update 
 * app.put('/users/:id'); use to particular id user update 
 * app.delete('/users/:id'); use to particular id user deleted 
 * 
 * ...................................................................
 */