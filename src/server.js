import "dotenv/config";

import pool from "./config/db.js"


import app from "./app.js";

const PORT = process.env.PORT || 5000;

async function startServer(){
    try {
        await pool.query("SELECT NOW()");
        console.log("✅ Connected to Neon PostgreSQL");

        app.listen(PORT,()=>{
    console.log(`Server is running on PORT${PORT}`);  
});
        
    } catch (error) {
    console.error("❌ Database Connection Failed");
    console.error(error);
        
    }
}

startServer();



