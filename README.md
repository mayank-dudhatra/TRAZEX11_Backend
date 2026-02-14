# Trazex Backend API

A comprehensive backend service built with Node.js, Express.js, and MongoDB for handling authentication and API services for both Admin Panel (React.js) and User App (React Native Expo).

## 🚀 Features

- **Dual Authentication System**: Automatic role detection for Admin and User
- **JWT-based Authentication**: Secure token-based authentication
- **Role-based Access Control**: Separate endpoints for Admin and User
- **Password Security**: bcrypt hashing with salt rounds
- **Input Validation**: Comprehensive validation using express-validator
- **Rate Limiting**: Protection against brute force attacks
- **Error Handling**: Centralized error handling middleware
- **Security Headers**: Helmet.js for security headers
- **CORS Support**: Configurable CORS for multiple origins

## 📁 Project Structure

```
Backend/
├── config/
│   └── database.js          # MongoDB connection configuration
├── controllers/
│   ├── authController.js    # Authentication logic (signup, login)
│   ├── adminController.js   # Admin-specific functionality
│   └── userController.js    # User-specific functionality
├── middleware/
│   ├── auth.js              # JWT authentication & role middleware
│   └── errorHandler.js      # Centralized error handling
├── models/
│   └── User.js              # User model with bcrypt integration
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── admin.js             # Admin-only routes
│   └── user.js              # User-only routes
├── utils/
│   └── validation.js        # Input validation rules
├── .env                     # Environment variables
├── package.json             # Dependencies and scripts
└── server.js                # Main application entry point
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   cd Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```
   PORT=3000
   MONGO_URI=mongodb+srv://mayankapi6:g58Rc8dB7OgwgfgD@trazex.vra1e.mongodb.net/
   ADMIN_ID=trazex11admin@gmail.com
   ADMIN_PASS=trazex11@98admin
   JWT_SECRET=aviaznmqcqqwgjxr
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### 1. User Signup
- **POST** `/auth/signup`
- **Description**: Register a new user account
- **Access**: Public
- **Body**:
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user"
    }
  }
  ```

#### 2. Login (Auto Role Detection)
- **POST** `/auth/login`
- **Description**: Login with automatic Admin/User role detection
- **Access**: Public
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "role": "user"
    }
  }
  ```

#### 3. Get Profile
- **GET** `/auth/profile`
- **Description**: Get current user profile
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`

#### 4. Logout
- **POST** `/auth/logout`
- **Description**: Logout user (client should remove token)
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`

### Admin Endpoints (Admin Only)

#### 1. Dashboard Statistics
- **GET** `/admin/dashboard`
- **Description**: Get dashboard statistics
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <admin_token>`

#### 2. Get All Users
- **GET** `/admin/users?page=1&limit=10`
- **Description**: Get all users with pagination
- **Access**: Admin only

#### 3. Get User by ID
- **GET** `/admin/users/:id`
- **Description**: Get specific user details
- **Access**: Admin only

#### 4. Update User Status
- **PUT** `/admin/users/:id/status`
- **Description**: Activate/deactivate user account
- **Access**: Admin only
- **Body**:
  ```json
  {
    "isActive": true
  }
  ```

#### 5. Delete User
- **DELETE** `/admin/users/:id`
- **Description**: Delete user account
- **Access**: Admin only

### User Endpoints (User Only)

#### 1. Get My Profile
- **GET** `/user/profile`
- **Description**: Get current user profile
- **Access**: User only
- **Headers**: `Authorization: Bearer <user_token>`

#### 2. Update Profile
- **PUT** `/user/profile`
- **Description**: Update user profile information
- **Access**: User only
- **Body**:
  ```json
  {
    "username": "newusername",
    "email": "newemail@example.com"
  }
  ```

#### 3. Change Password
- **PUT** `/user/change-password`
- **Description**: Change user password
- **Access**: User only
- **Body**:
  ```json
  {
    "currentPassword": "oldpassword",
    "newPassword": "NewSecurePass123"
  }
  ```

#### 4. Delete Account
- **DELETE** `/user/account`
- **Description**: Delete user account
- **Access**: User only
- **Body**:
  ```json
  {
    "password": "current_password"
  }
  ```

## 🔐 Authentication Flow

### Role Detection Logic
1. User provides email and password
2. System checks if credentials match Admin environment variables
3. If match → User authenticated as Admin
4. If no match → System checks MongoDB for user credentials
5. If found → User authenticated as regular User
6. If not found → Authentication fails

### Token Usage
Include the JWT token in request headers:
```
Authorization: Bearer <your_jwt_token>
```

## 🛡️ Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: 7-day expiration
- **Rate Limiting**: 
  - General API: 100 requests per 15 minutes
  - Auth endpoints: 5 requests per 15 minutes
- **Input Validation**: Comprehensive validation using express-validator
- **Security Headers**: Helmet.js protection
- **CORS**: Configurable origin restrictions

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port number | Yes |
| `MONGO_URI` | MongoDB connection string | Yes |
| `ADMIN_ID` | Fixed admin email | Yes |
| `ADMIN_PASS` | Fixed admin password | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `NODE_ENV` | Environment mode | No |

## 🚦 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## 🧪 Testing the API

### Using cURL

#### Admin Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trazex11admin@gmail.com","password":"trazex11@98admin"}'
```

#### User Signup:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test123"}'
```

### Health Check
```bash
curl http://localhost:3000/health
```

## 🔧 Development

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

### Logging
The application includes comprehensive error logging and request monitoring in development mode.

## 📱 Integration

### React.js Frontend (Admin)
Use admin token for accessing `/api/admin/*` endpoints

### React Native Expo (User App)
Use user token for accessing `/api/user/*` endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.