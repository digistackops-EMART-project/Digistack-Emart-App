import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { authApi } from '../../services/authApi';
import { useAuth } from '../../context/AuthContext';   // ✅ IMPORTANT
import './Auth.css';

const schema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Enter a valid email address'),
  password: yup
    .string()
    .required('Password is required')
    .min(1, 'Password cannot be empty'),
});

function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();   // ✅ Get login from context

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async (data) => {
    setIsLoading(true);

    try {
      const response = await authApi.login(data);

      const { token, name, email, roles } = response.data.data;

      // ✅ Use AuthContext login (DO NOT use localStorage directly)
      login(token, { name, email, roles });

      toast.success(`Welcome back, ${name}!`);

      // ✅ Redirect to dashboard
      navigate('/dashboard');

    } catch (error) {
      const status = error.response?.status;
      let message = 'Login failed. Please try again.';

      if (status === 401) {
        message = 'Invalid email or password. Please check your credentials.';
      } else if (status === 423) {
        message = 'Your account is locked. Please contact support.';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">

        <div className="auth-logo">
          <h1>Emart</h1>
          <p>Sign in to your account</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              className={errors.email ? 'input-error' : ''}
              {...register('email')}
            />
            {errors.email && (
              <span className="error-msg">
                {errors.email.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              className={errors.password ? 'input-error' : ''}
              {...register('password')}
            />
            {errors.password && (
              <span className="error-msg">
                {errors.password.message}
              </span>
            )}
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" /> Remember me
            </label>
            <Link to="/forgot-password" className="forgot-link">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>

          <p className="auth-link">
            New to Emart? <Link to="/signup">Create an account</Link>
          </p>

        </form>
      </div>
    </div>
  );
}

export default Login;
