// models/index.js
import mongoose from 'mongoose';

// Import all models
import './User.js';
import './Group.js';
import './Message.js';
import './GroupMember.js';
import './Status.js';

console.log('✅ All models loaded successfully');

export { default as User } from './User.js';
export { default as Group } from './Group.js';
export { default as Message } from './Message.js';
export { default as GroupMember } from './GroupMember.js';
export { default as Status } from './Status.js';