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
const uri = 'mongodb+srv://Mittens1415:nRl%38jJUokLjxVDoa@cluster1415.r81rd4e.mongodb.net/';
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

app.use(bodyParser.urlencoded({extended:false}));


app.get("/", (request, response) => {  
    const variable = {portNumber};
	response.render("main_page",variable);  
});

app.post("/login", async (req, res) => {
    try {
        await client.connect();
        const database = client.db(process.env.MONGO_DB_NAME);
        const collection = database.collection(process.env.MONGO_COLLECTION);
        const username = req.body.username;  
        const user = await collection.findOne({ email: username });

        if (user && user.password === req.body.password) { // Ensuring password match
            res.render("dashboard"); // Render the dashboard view
        } else {
            res.render("error_page"); // Render error page if user not found or password mismatch
        }
    } catch (error) {
        console.error("Login error:", error);
        res.render("error_page");
    } finally {
        await client.close();
    }
});

app.get("/signUp",(request,response) =>{
    const variable = {portNumber};
    response.render("signUp",variable);
})

async function insert_user(client,databaseAndCollection,new_application){
    await client.connect();
    await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(new_application);
}

app.post("/signUp", async (req, res) =>{
    console.log("I come here bitch!");
    const { 
        name, gender, age, email, password, phoneNumber, dob, housingPriceRange, locationPreference, blurb, 
        roommateMinimumAge, roommateMaximumAge, dailyRoutine, prefer_gender, foodPreference, pets, guestFrequency, smoking
    } = req.body;

    const userData = {
        name: name,
        gender: gender,
        age: age,
        email: email,
        password: password,
        phoneNumber: phoneNumber,
        dob: dob,
        housingPriceRange: housingPriceRange,
        locationPreference: locationPreference,
        blurb: blurb,
        matches: [],
        preferences: {
            roommateMinimumAge: roommateMinimumAge,
            roommateMaximumAge: roommateMaximumAge,
            dailyRoutine: dailyRoutine,
            prefer_gender: prefer_gender,
            foodPreference: foodPreference,
            pets: pets,
            guestFrequency: guestFrequency,
            smoking: smoking
        }
    };

    try {
        console.log("This is where I am 1");
        await insert_user(client, databaseAndCollection, userData);
    } catch (error) {
        console.error(error);
        res.render("error_page");
    } finally {
        console.log("This is where I am 2");
        await client.close();
    }   
    console.log("This is where I am");
    res.render("signup_successful_page");
});


app.set("views", path.resolve(__dirname, "templates"));  
app.set("view engine", "ejs"); 
app.use(bodyParser.urlencoded({extended:false}));

app.listen(portNumber);