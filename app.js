const http = require('http'); 
const bodyParser = require("body-parser");  
const express = require('express'); 
const app = express();    
const path = require("path"); 
const tailwind = require('tailwindcss')

const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') }) 

const databaseAndCollection = {db: `${process.env.MONGO_DB_NAME}`, collection:`${process.env.MONGO_COLLECTION}`};
const user_name = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const uri = "mongodb+srv://" + user_name + ":" + password + "@cluster%1415.r81rd4e.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1 });

process.stdin.setEncoding("utf8");

if (process.argv.length != 3) { 
	process.stdout.write(`Usage: node app.js portNumber\n`); 
	process.exit(1); 
}
const portNumber = process.argv[2];
console.log(`Web server started and running at http://localhost:${portNumber}`); 
process.stdout.write(`Stop to shutdown the server: `);
process.stdin.on("readable", function (){ 
    let dataInput = process.stdin.read(); 
	if (dataInput != null){ 
	    let command = dataInput.trim(); 
	    if (command === "stop"){ 
	        process.stdout.write("Shutting down the server\n"); 
	        process.exit(0); 
	    }else{
            process.stdout.write("Invalid Command\n");
            process.exit(1);
        }
    }
});

app.get("/", (request, response) => {  
    const variable = {portNumber};
	response.render("main_page",variable);  
});

async function userfinder(client,databaseAndCollection,target_name){
    await client.connect();
    let filter = {name: target_name};
    const cursor = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).find(filter);
    const result = await cursor.toArray();
    return result;
}

app.post("/login", async (req, res) => {
    try {
        await client.connect();
        const database = client.db(process.env.MONGO_DB_NAME);
        const collection = database.collection(process.env.MONGO_COLLECTION);

        const user = await collection.findOne({ username: req.body.username });

        if (user && user.password === req.body.password) { // Note: Use bcrypt in production for password comparison
            res.render("dashboard");
        } else {
            res.render("login_error"); // Ensure you have a view for login errors
        }
    } catch (error) {
        console.error(error);
        res.render("error_page");
    } finally {
        await client.close();
    }
});

app.get("/signUp",(request,response) =>{
    response.render("signUp");
})

app.set("views", path.resolve(__dirname, "templates"));  
app.set("view engine", "ejs"); 
app.use(bodyParser.urlencoded({extended:false}));

app.listen(portNumber);