import {model, Schema} from 'mongoose';

const userSchema = new Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        minlength: 3,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6
    },
    role: {
        type: String,
        enum: ['USER', 'ADMIN'],
        default: 'USER'
    },
    profileImgurl: {
        type: String,
        default: ''
    },
    isUserActive: {
        type: Boolean,
        default: true
    }
});

export const UserModel = model('User', userSchema);