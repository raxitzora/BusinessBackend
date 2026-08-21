import ServiceModel from "../models/service.model.js";

class ServiceController {

    async getAllServices(req, res) {

        try {

            const services = await ServiceModel.getAllServices();

            return res.status(200).json({
                success: true,
                count: services.length,
                services
            });

        } catch (error) {

            console.error("Get Services Error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch services."
            });

        }

    }

}

export default new ServiceController();