import { User } from '../models/user.model.js';
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import getDataUri from '../utils/datauri.js';
import cloudinary from '../utils/cloudinary.js';
import { Post } from '../models/post.model.js';

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(401).json({
                message: "Something is missing, please check!",
                success: false,
            });
        }


        const user = await User.findOne({ email }); //check if user already exists
        if (user) {
            return res.status(401).json({
                message: "Already Account exists with this email. Try another emailId",
                success: false,
            });
        };
        const hashedPassword = await bcrypt.hash(password, 10);   // hash your password
        await User.create({     // It required only those data which are required=true in model
            username,
            email,
            password: hashedPassword
        });
        return res.status(201).json({
            message: "Account Created Successfully.",
            success: true,
        });

    } catch (error) {
        console.log(error);
    }
}


export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(401).json({
                message: "Something is missing, please check!",
                success: false,
            });
        }

        let user = await User.findOne({ email });  // check does user exists by this email or pasword for login
        if (!user) {
            return res.status(401).json({
                message: "Incorrect Email or Password",
                success: false,
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                message: "Incorrect Email or Password",
                success: false,
            });
        }
        const token = await jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '1d' });
        // Populate each post if in the post array

        const populatedPosts = await Promise.all(
            user.posts.map(async(postId)=>{
                const post = await Post.findById(postId);
                if(post.author.equals(user._id)){
                    return post;
                }
                return null;
            })
        )

        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            post:populatedPosts
        }

        return res.cookie('token', token, { httpOnly: true, sameSite: 'strict', maxAge: 1 * 24 * 60 * 60 * 1000 }).json({
            message: `Welocome back ${user.username}`,
            success: true,
            user
        });

    } catch (error) {
        console.log(error);
    }
}

export const logout = async (req, res) => {
    try {
        return res.cookie("token", "", { maxAge: 0 }).json({
            message: "Logged out successfully.",
            success: true
        });
    } catch (error) {
        console.log(error);
    }
};


export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;  // so that u can open any user whose id provided
        let user = await User.findById(userId).populate({path:'posts',createdAt:-1}).populate('bookmarks');
        return res.status(200).json({
            user,
            success: true
        });

    } catch (error) {
        console.log(error);
    }
}

export const editProfile = async (req, res) => {
    try {
        // const 
        const userId = req.id;
        const { bio, gender } = req.body;
        const profilePicture = req.file;
        // let cloudResponse
        let cloudResponse;
        if (profilePicture) {
            const fileUri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileUri);
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({
                message: 'User not found.',
                success: false
            })
        };

        if (bio) {
            user.bio = bio;
        }
        if (gender) {
            user.gender = gender;
        }
        if (profilePicture) {
            user.profilePicture = cloudResponse.secure_url;
        }

        await user.save();

        return res.status(200).json({
            message: 'Profile Updated.',
            success: true,
            user
        })

    } catch (error) {
        console.log(error);
    }
};


export const getSuggestedUsers = async (req, res) => {
    try {
        const suggestedUsers = await User.find({ _id: { $ne: req.id } }).select("-password");
        if (!suggestedUsers) {
            return res.status(400).json({
                message: "Currently do not have any users.",
            })
        };

        return res.status(200).json({
            success: true,
            users: suggestedUsers
        })
    } catch (error) {
        console.log(error);
    }
};

export const followOrUnfollow = async (req, res) => {
    try {
        const followKrneWala = req.id;          //me
        const jiskoFollowkrungi = req.params.id;    // nitin ko follow krungi
        if (followKrneWala === jiskoFollowkrungi) {
            return res.status(400).json({
                message: 'You cannot follow/Unfollow yourself.',
                success: false
            });
        }

        const user = await User.findById(followKrneWala);
        const targetUser = await User.findById(jiskoFollowkrungi);

        if (!user || !targetUser) {
            return res.status(400).json({
                message: 'User not found.',
                success: false
            });
        }

        // Now i will check that i should follow or not

        const isFollowing = user.following.includes(jiskoFollowkrungi)    // check that if already followed
        if (isFollowing) {
            // unfollow Logic
            await Promise.all([
                User.updateOne({ _id: followKrneWala }, { $pull: { following: jiskoFollowkrungi } }),
                User.updateOne({ _id: jiskoFollowkrungi }, { $pull: { followers: followKrneWala } }),
            ])
            return res.status(200).json({
                message: 'Unfollowed Successfully.',
                success: true
            })

        } else {
            await Promise.all([
                User.updateOne({ _id: followKrneWala }, { $push: { following: jiskoFollowkrungi } }),
                User.updateOne({ _id: jiskoFollowkrungi }, { $push: { followers: followKrneWala } }),
            ])        // When u work with 2 documents of same type then we generally use promise here me and nitin
        }

        return res.status(200).json({
            message: 'followed Successfully.',
            success: true
        })

    } catch (error) {
        console.log(error);
    }
}


