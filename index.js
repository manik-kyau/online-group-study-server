const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middle ware
app.use(cors({
  origin: [
    'https://online-group-study-7e47f.web.app',
    'https://online-group-study-7e47f.firebaseapp.com',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jm3t3oc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Middle wire
const logger = async (req, res, next) => {
  // console.log('called:', req.host, req.originalUrl);
  console.log('log info: ', req.method, req.url);
  next();
}

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log('token in the middleware: ', token);
  // next()
  // No token available
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    // error
    if (err) {
      console.log(err);
      return res.status(401).send({ message: 'Unauthorized access' })
    }
    // if token is valid then it would be decoded
    console.log('Value in the token ', decoded);
    req.user = decoded;
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const assignmentCollection = client.db("onlinegroupstudyDB").collection("assignments");
    const submitCollection = client.db("onlinegroupstudyDB").collection("submitassignments");
    const userCollection = client.db("onlinegroupstudyDB").collection("users");
    const featureCollection = client.db("onlinegroupstudyDB").collection("features");

    // auth related api jwt
    app.post('/jwt', async (req, res) => {
      const user = req.body
      console.log('user for token', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      })
        .send({ success: true })
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log('login out user: ', user);
      res.clearCookie('token', { maxAge: 0 }).send({ success: true })
    })


    // feature related api
    app.get('/features', async (req, res) => {
      const cursor = featureCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })
    // assignments related api
    app.get('/assignments', async (req, res) => {
      const cursor = assignmentCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    // Update Operation
    app.get('/assignment/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assignmentCollection.findOne(query);
      res.send(result);
    })

    app.put('/assignment/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedAssignment = req.body;
      const assignment = {
        $set: {
          title: updatedAssignment.title,
          description: updatedAssignment.description,
          marks: updatedAssignment.marks,
          imageURL: updatedAssignment.imageURL,
          difficultyLevel: updatedAssignment.difficultyLevel,
          date: updatedAssignment.date,
        },
      };
      const result = await assignmentCollection.updateOne(filter, assignment, options);
      res.send(result);
    })

    app.post('/assignments', async (req, res) => {
      const newAssignment = req.body;
      console.log(newAssignment);
      const result = await assignmentCollection.insertOne(newAssignment);
      res.send(result);
    })


    // delete operation
    app.delete('/assignments/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assignmentCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/assignments/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await assignmentCollection.findOne(query);
      res.send(result);
    })

    app.get('/submition',logger, verifyToken, async (req, res) => {
      const result = await submitCollection.find().toArray();
      res.send(result)
    })

    // Update Operation
    app.get('/submits/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await submitCollection.findOne(query);
      res.send(result);
    })

    app.put('/submits/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedSubmit = req.body;
      const assignmentSubmit = {
        $set: {
          title: updatedSubmit.title,
          pdf: updatedSubmit.pdf,
          marks: updatedSubmit.marks,
          email: updatedSubmit.email,
          message: updatedSubmit.message,
          studentName: updatedSubmit.studentName,
          assignment_id: updatedSubmit.assignment_id,
          givemark: updatedSubmit.givemark,
          feedback: updatedSubmit.feedback,
        },
      };
      const result = await submitCollection.updateOne(filter, assignmentSubmit, options);
      res.send(result);
    })

    // specifiq student submited assignment
    app.get('/submits',logger,verifyToken, async (req, res) => {
      console.log('token owner info: ', req.user);
      if(req.user.email !== req.query.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await submitCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/submits', async (req, res) => {
      const subAssignment = req.body;
      console.log(subAssignment);
      const result = await submitCollection.insertOne(subAssignment);
      res.send(result);
    })

    // create user
    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await userCollection.insertOne(user);
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Online Group Study Server is Running.');
})

app.listen(port, () => {
  console.log(`Online Group Study Server Running on port ${port}`);
})