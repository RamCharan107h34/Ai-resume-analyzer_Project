import exp from "express";
import env from "dotenv";
import { connect } from "mongoose";
import { commonApp } from "./APIs/CommonAPI.js";
import { userApp } from "./APIs/UserAPI.js";
import { adminApp } from "./APIs/AdminAPI.js";
import cors from "cors";
import cookieParser from "cookie-parser";
env.config();
import dns from 'dns';


const app = exp();
// Change DNS
dns.setServers(["1.1.1.1", "8.8.8.8"]);
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
  }),
);

app.use(exp.json());
app.use(cookieParser());

// import routes
app.use("/auth", commonApp);
app.use("/user", userApp);
app.use("/admin", adminApp);

// connect to db and start server
const connectDB = async()=> {
    try {
        await connect(process.env.DB_URL)
        console.log("Db connected")
        // assign port
        const port = process.env.PORT || 5000
        app.listen(port,()=>console.log(`server listening on ${port} `))
    }catch(err){
        console.log("err in db connect",err)
    }
}

connectDB()

// handle invalid path
app.use((req,res,next)=>{
    console.log(req.url)
    res.status(404).json({message:`Path ${req.url} is invalid`})
})

//Error handling middleware
app.use((err, req, res, next) => {
  console.log(err)
  //ValidationError
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: "error occurred", error: err.message });
  }
  //CastError
  if (err.name === "CastError") {
    return res.status(400).json({ message: "error occurred", error: err.message });
  }
  const errCode = err.code ?? err.cause?.code ?? err.errorResponse?.code;
  const keyValue = err.keyValue ?? err.cause?.keyValue ?? err.errorResponse?.keyValue;

  if (errCode === 11000) {
    const field = Object.keys(keyValue)[0];
    const value = keyValue[field];
    return res.status(409).json({
      message: "error occurred",
      error: `${field} "${value}" already exists`,
    });
  }

  //send server side error
  res.status(500).json({ message: "error occurred", error: err.message });
});