
// import fetch from "node-fetch"; // ES module syntax for importing fetch
// import axios from "axios"; // ES module syntax for importing axios
// import mongoose from "mongoose"; // ES module syntax for importing mongoose

// // Connect to MongoDB
// mongoose.connect('mongodb+srv://mayurishamal24:fJsXMHTsQhF9I3je@mayuri.rpxafnj.mongodb.net/?retryWrites=true&w=majority&appName=Product1', {
//     useNewUrlParser: true, 
//     useUnifiedTopology: true
// }).then(() => console.log("MongoDB connected"))
// .catch(err => console.error(err));

// // Define the schema
// const productSchema = new mongoose.Schema({
//     id: Number,
//     title: String,
//     price: Number,
//     description: String,
//     category: String,
//     image: String,
//     sold: Boolean,
//     dateOfSale: Date
// });

// // Create the model
// const Product = mongoose.model('Product', productSchema);

// // Function to fetch data from API and store it in MongoDB
// async function fetchDataAndStore() {
//     try {
//         // Fetch data from the API
//         const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
//         const products = response.data;

//         // Loop through each product and store it in MongoDB
//         for (let productData of products) {
//             const product = new Product({
//                 id: productData.id,
//                 title: productData.title,
//                 price: productData.price,
//                 description: productData.description,
//                 category: productData.category,
//                 image: productData.image,
//                 sold: false, // or handle based on your logic
//                 dateOfSale: new Date() // or use the date from the API if available
//             });

//             await product.save(); // Save each product in the database
//             console.log(`Product saved: ${product.title}`);
//         }
//         console.log("All products saved to MongoDB.");
//     } catch (err) {
//         console.error("Error fetching or saving data:", err);
//     } finally {
//         mongoose.connection.close(); // Close the MongoDB connection
//     }
// }

// // Call the function to fetch and store data
// fetchDataAndStore();

// // Function to fetch posts using `node-fetch`
// async function getPosts() {
//     try {
//         const response = await fetch("https://s3.amazonaws.com/roxiler.com/product_transaction.json");
//         const data = await response.json(); // Parse the JSON data
//         console.log(data); // Do something with the data
//     } catch (error) {
//         console.error("Error fetching the posts:", error);
//     }
// }

// // Call the function to fetch posts
// getPosts();
















// Import required modules
import express from 'express';
import mongoose from 'mongoose';

// Initialize Express app
const app = express();

// Connect to MongoDB
mongoose.connect('mongodb+srv://mayurishamal24:fJsXMHTsQhF9I3je@mayuri.rpxafnj.mongodb.net/Product1', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));


const productSchema = new mongoose.Schema({
  id: Number,
  title: String,
  price: Number,
  description: String,
  category: String,
  image: String,
  sold: Boolean,
  dateOfSale: Date,
});

const Product = mongoose.model('Product', productSchema);

const port = process.env.PORT || 5000;  // Set the port to 5000, or use environment variable PORT
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});



app.get('/api/products', async (req, res) => {
    try {
      const { page = 1, perPage = 10, search = '', month } = req.query;
  
      // Create the base query object
      let query = {};
  
      // Search functionality (optional, based on title, description, etc.)
      if (search) {
        query = {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { price: { $regex: search } },
          ],
        };
      }
  
      // If month is provided, filter by the month of the `dateOfSale`
      if (month) {
        const monthInt = parseInt(month, 10); // Convert month string to integer
        query['$expr'] = {
          $eq: [{ $month: '$dateOfSale' }, monthInt], // Extract the month and compare
        };
      }
  
      // Fetch products with pagination
      const products = await Product.find(query)
        .skip((page - 1) * perPage)
        .limit(parseInt(perPage));
  
      // Total products for pagination
      const totalProducts = await Product.countDocuments(query);
  
      res.json({ products, totalProducts });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  



  app.get('/api/products/statistics', async (req, res) => {
    try {
        const { month } = req.query;

        if (!month) {
            return res.status(400).json({ error: 'Month parameter is required' });
        }

        const monthInt = parseInt(month, 10); // Convert month string to integer

        // Query for the selected month
        const query = {
            '$expr': {
                $eq: [{ $month: '$dateOfSale' }, monthInt] // Extract the month and compare
            }
        };

        // Total Sales Amount
        const totalSalesAmount = await Product.aggregate([
            { $match: query }, 
            { $group: { _id: null, totalAmount: { $sum: "$price" } } }
        ]);

        // Total number of sold items
        const totalSoldItems = await Product.countDocuments({ ...query, sold: true });

        // Total number of not sold items
        const totalNotSoldItems = await Product.countDocuments({ ...query, sold: false });

        res.json({
            totalSalesAmount: totalSalesAmount.length > 0 ? totalSalesAmount[0].totalAmount : 0,
            totalSoldItems,
            totalNotSoldItems
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



app.get('/api/products/bar-chart', async (req, res) => {
    try {
        const { month } = req.query;

        if (!month) {
            return res.status(400).json({ error: 'Month parameter is required' });
        }

        const monthInt = parseInt(month, 10); // Convert month string to integer

        // Query to match the month
        const query = {
            '$expr': {
                $eq: [{ $month: '$dateOfSale' }, monthInt]
            }
        };

        // Aggregate to count items in specified price ranges
        const priceRanges = [
            { $match: query },
            {
                $bucket: {
                    groupBy: "$price",
                    boundaries: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
                    default: "901-above", // Category for items priced above the highest boundary
                    output: {
                        count: { $sum: 1 }
                    }
                }
            }
        ];

        const result = await Product.aggregate(priceRanges);

        res.json(result);
    } catch (error) {
        console.error('Error fetching bar chart data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
