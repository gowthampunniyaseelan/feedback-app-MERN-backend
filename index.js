const express = require("express");
const Cors = require("cors");
const dotenv = require("dotenv");
const fast2sms = require('fast-two-sms')
const jwt = require("jsonwebtoken");
const axios = require('axios');
const moment = require("moment");
// const currentMonth = moment().startOf("month").toDate();

// const currentDate = new Date();
// const sixMonthsAgo = moment(currentDate).subtract(6, "months").startOf("month").toDate();
dotenv.config();
const app = express();
app.use(Cors());
app.use(express.json());

const mongoose = require("mongoose");
const currentDate = new Date();

// Calculate the timestamp for six months ago
const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
const timestampLastSixMonths = sixMonthsAgo.getTime();
const feedbackSchema = mongoose.Schema({
  date: String,
  customer_phone_number: String,
  visiting_time: String,
  the_quality_of_the_food:String,
  cleanliness:String,
  quality_of_service:String,
  employee_behaviour:String,
  speed_of_service:String,
  appearance_of_employee:String,
  value_for_cash:String,
  comments:String,
  wishes:String,
  overall_rating:String,
});

const customerSchema = mongoose.Schema({
  customer_name:String,
  hotel_name:String,
  customer_phone_number: String,
  customer_birthday_date:String,
  customer_wedding_date:String,
  isActive:Boolean
});

const hotelSchema = mongoose.Schema({
  hotel_name:String,
  address:String,
  phone_number: String,
  hotel_poc:String,
  customer_wedding_date:String,
  username: String,
  password: String,
});

const feedbackModel = mongoose.model("feedbacks", feedbackSchema);
const customerModel = mongoose.model("customers", customerSchema);
const hotelModel = mongoose.model("hotels", hotelSchema);


mongoose
  .connect(process.env.DB_URI, {
    useNewUrlParser: true,
  })
  .then((result) => {
    console.log("DB CONNECTED");
  })
  .catch((e) => {
    console.log(e);
  });


app.post("/feedback", async (req, res) => {
  const response = [];
  feedbackModel
    .create({
  date: req.body.date,
  customer_phone_number: req.body.customer_phone_number,
  visiting_time: req.body.visiting_time,
  the_quality_of_the_food:req.body.the_quality_of_the_food,
  cleanliness:req.body.cleanliness,
  quality_of_service:req.body.quality_of_service,
  employee_behaviour:req.body.employee_behaviour,
  speed_of_service:req.body.speed_of_service,
  appearance_of_employee:req.body.appearance_of_employee,
  value_for_cash:req.body.value_for_cash,
  comments:req.body.comments,
  wishes:req.body.wishes,
  overall_rating:req.body.overall_rating,
    })
    .then((result) => {
      response.push(result);
    })
    .catch((e) => {
      res.send(e);
    });
  try {
    const result = await customerModel.findOne({customer_phone_number:req.body.customer_phone_number});
    if(!result){
      const customer = await customerModel.create({
        customer_name:req.body.customer_name,
        hotel_name:"localhost",
        customer_phone_number:req.body.customer_phone_number,
        customer_birthday_date:req.body.customer_birthday_date,
        customer_wedding_date:req.body.customer_wedding_date,
        isActive:req.body.isActive
      });
      response.push(customer);
    } else {
      console.log("Customer already exists");
    }
    res.send({message:response});
  } catch (e) {
    res.send({ error: e.message });
  }
  
})


app.get("/sync-user/:username/:password", (req, res) => {
  hotelModel
    .findOne({username:req.params.username,password:req.params.password})
    .then((result) => {
      const authToken = jwt.sign({username:result.username,password:result.password},process.env.PRIVATE_KEY)
      res.json({username:result.username,authToken:authToken});
    })
    .catch((e) => {
      res.send(e);
    });
});


app.get("/feedback/:id", (req, res) => {
  customerModel
    .findOne({customer_phone_number: req.params.id })
    .then((result) => {
      res.send(result);
    })
    .catch((e) => {
      res.send(e);
    });
});


app.get("/sync", (req, res) => {
  customerModel
    .find({isActive:true,hotel_name:"localhost"})
    .then((result) => {
      res.send(result);
    })
    .catch((e) => {
      res.send(e);
    });
});


app.get("/count", (req, res) => {
  customerModel
    .find()
    .then((result) => {
      res.send(result);
    })
    .catch((e) => {
      res.send(e);
    });
});


app.post("/sms",async (req,res)=>{
let userName = req.body.username;
let phoneNumber = req.body.phoneNumber
let senderId = req.body.senderId
let messageId = req.body.messageId
let str = Object.values(userName).join('|');
let url = `${process.env.FAST_2_SMS}?authorization=${process.env.API_KEY}&route=dlt&sender_id=${senderId}&message=${messageId}&variables_values=${str}&flash=0&numbers=${phoneNumber}`;

// promises.push(
  axios.get(url)
    .then(response => {
      return res.send(response.data);
    })
    .catch(error => {
      console.error(error);
    })
// );

})

app.post("/bulksms", (req, res) => {
  let promises = [];
  let mobileArr = [];
  let names = [];

  customerModel
    .find()
    .then((response) => {
      response.map((item) => {
        let { customer_phone_number, customer_name } = item;
        mobileArr.push(customer_phone_number);
        names.push(customer_name);
      });

      for (let i = 0; i < mobileArr.length; i++) {
        let userName = names[i];
        let senderId = req.body.senderId
        let messageId = req.body.messageId
        let variableValues = req.body.username;
        let str = Object.values(variableValues).join('|');
        if(str === ""){
          str = userName 
        }else{
          str = userName + "|" + str
        }
        let url = `${process.env.FAST_2_SMS}?authorization=${process.env.API_KEY}&route=dlt&sender_id=${senderId}&message=${messageId}&variables_values=${str}&flash=0&numbers=${mobileArr[i]}`;

        promises.push(
          axios.get(url)
            .then(response => {
              return response.data;
            })
            .catch(error => {
              console.error(error);
            })
        );
      }

      Promise.all(promises)
        .then((responses) => {
          res.send(responses);
        })
        .catch((error) => {
          res.send(error);
        });
    })
    .catch((e) => {
      res.send(e);
    });
});



app.get("/refresh-sms-balance",async (req,res)=>{
  const {wallet} = await fast2sms.getWalletBalance(process.env.API_KEY) 
  res.send(wallet);
})

app.get("/overall-rating",(req,res)=>{
  feedbackModel.find().then((response)=>{
    res.send(response)
  }).catch((e)=>{
    console.log(e);
  })
})

app.get("/current-month-rating",(req,res)=>{
  feedbackModel.find({ date: { $gte: currentMonth.toISOString() } })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send("Error retrieving current month data.");
    });
})

app.get("/last-six-month-rating",(req,res)=>{
feedbackModel.find({ date: { $gte: timestampLastSixMonths} })
  .then(data => {
    res.send(data)
  })
  .catch(error => {
    console.log(error);
  });
})


app.get("/overall-data/:id",async (req,res)=>{
let currentMonthArr = []
let lastSixMonth = []
let overall = []
let promises=[]
// Current month
await feedbackModel.find({ 
  date: { $gte: currentMonth.toISOString()},
  visiting_time:req.params.id
})
  .then((results) => {
    currentMonthArr.push(results)
  })
  .catch((error) => {
    console.error(error);
  });
// Last six month ago
  await feedbackModel.find({ 
    date: { $gte: timestampLastSixMonths},
    visiting_time:req.params.id
  })
    .then((results) => {
      lastSixMonth.push(results)
    })
    .catch((error) => {
      console.error(error);
    });


// Overall
    await feedbackModel.find({ 
      visiting_time:req.params.id
    })
      .then((results) => {
        overall.push(results)
      })
      .catch((error) => {
        console.error(error);
      });
      promises.push(currentMonthArr)
      promises.push(lastSixMonth)
      promises.push(overall)
      res.json({currentMonthArr:promises[0],lastSixMonth:promises[1],overall:promises[2]})

  })

app.get("/get-user/:id",(req,res)=>{
  customerModel.findOne({customer_phone_number:req.params.id}).then((response)=>{
    res.send(response)
  }).catch((error)=>{
    res.send(error)
  })
})

app.post("/feedback-sms",async (req,res)=>{
  let url = `${process.env.FAST_2_SMS}?authorization=${process.env.API_KEY}&route=dlt&sender_id=${req.body.senderId}&message=${req.body.messageId}&variables_values=${req.body.customer_name}&flash=0&numbers=${req.body.customer_phone_number}`;
  axios.get(url)
  .then(response => {
    res.send({message:response})
  })
  .catch(error => {
    res.send({message:error.message})
  })
})

app.get("/verify" ,(req, res) => {
  jwt.verify(req.header("x-auth-token"),process.env.PRIVATE_KEY,(err,result)=>{
    if(err) return res.json({message:"You are not allowed to login here"})
    if(result) return res.json(result)
  })
})
app.put("/edit-customer",async (req,res)=>{
  const { customer_name, customer_phone_number,customer_birthday_date,customer_wedding_date } = req.body;
  try {
    const updatedData = await customerModel.updateOne(
      { _id: req.body._id },
      {
        $set: {
          customer_name,
          customer_phone_number,
          customer_birthday_date,
          customer_wedding_date
        }
      }
    ).exec();

    const updatedDataOnfeedback = await feedbackModel.updateOne(
      { customer_phone_number: req.body.customer_phone_number },
      {
        $set: {
          customer_phone_number,
        }
      }
    ).exec();

    res.status(200).json({message:[updatedData,updatedDataOnfeedback]});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating customer' });
  }
})
app.put("/deactivate-customer/:id",(req,res)=>{
  customerModel.updateOne({_id:req.params.id},{isActive:false}).then((result)=>{
    res.status(204).json({message:"User deactivated succesfully"})
  }).catch((e)=>{
    res.status(404).json(e)
  })
})
app.listen("8080", () => {
  console.log("Localhost running on 8080");
});
