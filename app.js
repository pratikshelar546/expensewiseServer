
import {app} from "./api/index.js";
if(process.env.NODE_ENV !== "production"){
    app.listen(5000, "0.0.0.0",() => {
        console.log(`Server Started at ${5000}`)
    })
}

