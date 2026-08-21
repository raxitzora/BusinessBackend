import { getAuth } from "@clerk/express";

const authMiddleware = (req, res, next) => {

    const { isAuthenticated, userId } = getAuth(req);

    if (!isAuthenticated || !userId) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized."
        });

    }

    req.userId = userId;

    next();

};

export default authMiddleware;