import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"

const connectDB =  async () => {
    // console.log(process.env.MONGODB_URI)
    // console.log(DB_NAME)
    try{
        console.log('Connecting to DB.....')
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        // console.log(connectionInstance)
        console.log(`\n Mongo DB connected!! DB HOST: ${connectionInstance.connection.host}`)
    }catch(error){
        console.error('MONGODB Connection Failed : ', error)
        process.exit(1)
    }
}
export default connectDB