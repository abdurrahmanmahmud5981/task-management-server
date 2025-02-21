require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')


const morgan = require('morgan')

const port = process.env.PORT || 5000
const app = express()


// middleware
const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:4173', 'https://task-manage-bd.web.app'],
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))



// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.cookies?.token; // Retrieve token from cookies
    if (!token) return res.status(401).send({ message: "unauthorized access" });

    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).send({ message: "unauthorized access" });
        req.user = decoded; // Attach decoded token data to the request object
        next(); // Proceed to the next middleware
    });
};




// set up mongodb

const uri = `mongodb://localhost:27017`

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Connect to the MongoDB server
async function run() {
    try {
        await client.connect();
        // // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });

        // database creation 
        const db = client.db("tasksDB");
        // collection creation
        const tasksCollection = db.collection("tasks");

        // Endpoint to generate a JWT token
        app.post('/jwt', async (req, res) => {
            const email = req.body;
            const token = jwt.sign(email, process.env.SECRET_KEY, { expiresIn: '365d' });

            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
            }).send({ success: true });
        });

        // Endpoint to clear the JWT token (logout)
        app.post('/logout', async (req, res) => {
            res.clearCookie("token", {
                maxAge: 0,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
            }).send({ success: true });
        });


        // API 
        // **GET /tasks**: Fetch all tasks for the logged-in user.
        app.get("/tasks", async (req, res) => {
            const tasks = await tasksCollection.find().toArray();
            res.json(tasks);
        })


        // **POST /tasks**: Add a new task.
        app.post("/tasks", async (req, res) => {
            const newtask = req.body;
            const result = await tasksCollection.insertOne(newtask);
            res.send(result);
        })

        //  **PUT /tasks/:id**: Update a task (title, description, category).
        app.patch("/tasks/:id", async (req, res) => {
            const id = req.params?.id;
            const updatedtask = req.body;
            const query = { _id: new ObjectId(id) };
            const result = await tasksCollection.updateOne(query, { $set: updatedtask });
            res.send(result)
        })

        // **DELETE /tasks/:id**: Delete a task.
        app.delete("/tasks/:id", async (req, res) => {
            const filter = { _id: new ObjectId(req.params.id) };
            const result = await tasksCollection.deleteOne(filter);
            res.send(result);
        })

    } catch (error) {
        console.log(error.message);
    }
}

run()


app.get('/', (req, res) => {
    res.send('Hello From Task Management Server');
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})