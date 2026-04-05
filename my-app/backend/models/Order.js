const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: { type: String, required: true }, // You can use userId if you have a User model
  orderItems: [
    {itemid: { type: String, required: true },
      name: { type: String, required: true },
      qty: { type: Number, required: true },
      price: { type: Number, required: true },
      imageUrl: { type: String }
    }
  ],
  shippingAddress: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  paymentMethod: { type: String, required: true },
  paymentResult: {id: String,status: String,update_time: String,email_address: String
  },
  itemsPrice: { type: Number, required: true },
  shippingPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  isPaid: { type: Boolean, default: false },
  paidAt: { type: Date },
  isDelivered: { type: Boolean, default: false },
  deliveredAt: { type: Date }
}, { timestamps: true, collection: "Order_Info" });

module.exports = mongoose.model("Order", orderSchema);