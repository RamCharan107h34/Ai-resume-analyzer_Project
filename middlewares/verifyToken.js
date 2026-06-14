import jwt from 'jsonwebtoken'
import {config} from 'dotenv'
const {verify} = jwt
config()

 export const verifyToken = (...allowedRoles)=>{
    return (req,res,next)=>{
    // verfy Token logic
    try {
        // get token from cookie
        const token = req.cookies?.token
        // ckeck token existed
        if(!token){
            return res.status(401).json({message:"plz login"})
        }
        // validate token (decode the token)
        const decodedToken = verify(token,process.env.SECRET_KEY)
        // check the role is same as role in decodeed
        if(!allowedRoles.includes(decodedToken.role)){
            return res.status(403).json({message:"You are unauthorized user"})
        }
        // add decoded token
        req.user = decodedToken
        //console.log(req.user)
        // call next
        next()
    }catch(err){
        res.status(401).json({message:"session expired plz relogin"})
    } 
 }
 } 