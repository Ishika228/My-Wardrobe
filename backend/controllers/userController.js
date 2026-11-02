import User from '../models/User.js';

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private (Protected by authMiddleware)
 */
export const getUserProfile = async (req, res, next) => {
  try {
    // req.user is attached by authMiddleware without password
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/users/profile
 * @access  Private (Protected by authMiddleware)
 */
export const updateUserProfile = async (req, res, next) => {
  try {
    // Find the currently authenticated user by the verified token ID
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const {
      name,
      profileImage,
      gender,
      dateOfBirth,
      preferences,
    } = req.body;

    // Validate and update name
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty',
        });
      }
      user.name = name.trim();
    }

    // Update profile image
    if (profileImage !== undefined) {
      user.profileImage = profileImage ? String(profileImage).trim() : null;
    }

    // Update gender
    if (gender !== undefined) {
      user.gender = gender ? String(gender).trim() : null;
    }

    // Update date of birth
    if (dateOfBirth !== undefined) {
      const parsedDate = new Date(dateOfBirth);
      if (dateOfBirth && isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format for date of birth',
        });
      }
      user.dateOfBirth = dateOfBirth ? parsedDate : null;
    }

    // Update style/fashion preferences
    if (preferences && typeof preferences === 'object') {
      if (Array.isArray(preferences.favoriteColors)) {
        user.preferences.favoriteColors = preferences.favoriteColors.map((c) => String(c).trim());
      }
      if (Array.isArray(preferences.preferredStyles)) {
        user.preferences.preferredStyles = preferences.preferredStyles.map((s) => String(s).trim());
      }
      if (Array.isArray(preferences.preferredOccasions)) {
        user.preferences.preferredOccasions = preferences.preferredOccasions.map((o) => String(o).trim());
      }
    }

    // Note: email and password changes are explicitly prevented through this endpoint
    const updatedUser = await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};
