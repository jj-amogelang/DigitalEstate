import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock API functions (in a real app, these would call your backend)
const mockAPI = {
  // Initialize with a John Doe account
  users: [
    {
      id: 1,
      email: 'john.doe@example.com',
      password: 'password123', // In real app, this would be hashed
      firstName: 'John',
      lastName: 'Doe',
      profilePicture: null,
      createdAt: new Date('2025-01-01'),
      preferences: {
        defaultLocation: 'Sandton, Johannesburg',
        defaultPropertyType: 'residential',
        notifications: true,
        theme: 'light'
      }
    }
  ],

  login: async (email, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = mockAPI.users.find(u => u.email === email && u.password === password);
        if (user) {
          const { password: _, ...userWithoutPassword } = user;
          resolve({ user: userWithoutPassword, token: 'mock-jwt-token' });
        } else {
          reject(new Error('Invalid email or password'));
        }
      }, 1000);
    });
  },

  register: async (userData) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const existingUser = mockAPI.users.find(u => u.email === userData.email);
        if (existingUser) {
          reject(new Error('User already exists'));
        } else {
          const newUser = {
            id: mockAPI.users.length + 1,
            ...userData,
            createdAt: new Date(),
            preferences: {
              defaultLocation: '',
              defaultPropertyType: 'all',
              notifications: true,
              theme: 'light'
            }
          };
          mockAPI.users.push(newUser);
          const { password: _, ...userWithoutPassword } = newUser;
          resolve({ user: userWithoutPassword, token: 'mock-jwt-token' });
        }
      }, 1000);
    });
  },

  updateProfile: async (userId, updates) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const userIndex = mockAPI.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          mockAPI.users[userIndex] = { ...mockAPI.users[userIndex], ...updates };
          const { password: _, ...userWithoutPassword } = mockAPI.users[userIndex];
          resolve(userWithoutPassword);
        } else {
          reject(new Error('User not found'));
        }
      }, 500);
    });
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    setIsAuthenticating(true);
    try {
      const response = await mockAPI.login(email, password);
      setUser(response.user);
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('userData', JSON.stringify(response.user));
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const register = async (userData) => {
    setIsAuthenticating(true);
    try {
      const response = await mockAPI.register(userData);
      setUser(response.user);
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('userData', JSON.stringify(response.user));
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  };

  const updateProfile = async (updates) => {
    try {
      const updatedUser = await mockAPI.updateProfile(user.id, updates);
      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticating,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
