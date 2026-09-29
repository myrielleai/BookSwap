// Client-side validation rules for BookSwap forms.
// These mirror backend/helpers/validator.php so users see the same message
// before submitting; the backend still re-checks every field.

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Letters (any language), spaces, periods, apostrophes, hyphens; starts with a letter.
export const NAME_PATTERN = /^\p{L}[\p{L}\p{M} .'-]*$/u;
// 7 to 20 characters: digits, spaces, dashes, optional leading +.
export const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,19}$/;

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_MAX_MB = 5;

export const validateFullName = (value) => {
  const name = value.trim();
  if (!name) return 'Full name is required.';
  if (name.length > 100) return 'Full name must not exceed 100 characters.';
  if (!NAME_PATTERN.test(name)) {
    return 'Full name may only contain letters, spaces, periods, apostrophes and hyphens.';
  }
  return null;
};

export const validateEmailAddress = (value) => {
  const email = value.trim();
  if (!email) return 'Email address is required.';
  if (email.length > 255) return 'Email address must not exceed 255 characters.';
  if (!EMAIL_PATTERN.test(email)) return 'Please enter a valid email address (e.g. name@example.com).';
  return null;
};

export const validatePhoneNumber = (value) => {
  const phone = (value || '').trim();
  if (phone && !PHONE_PATTERN.test(phone)) {
    return 'Phone number must be 7 to 20 digits (spaces, dashes and a leading + are allowed), e.g. 09171234567.';
  }
  return null;
};

export const validateCity = (value) => {
  const city = (value || '').trim();
  if (city.length > 100) return 'City must not exceed 100 characters.';
  if (city && !NAME_PATTERN.test(city)) {
    return 'City may only contain letters, spaces, periods, apostrophes and hyphens.';
  }
  return null;
};

export const validateNewPassword = (value) => {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (value.length > 72) return 'Password must not exceed 72 characters.';
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
};

// Required or optional free-text field with a maximum length.
export const validateText = (value, label, max, required = false) => {
  const text = (value || '').trim();
  if (required && !text) return `${label} is required.`;
  if (text.length > max) return `${label} must not exceed ${max} characters.`;
  return null;
};

export const validatePhoto = (file) => {
  if (!file) return 'At least one photograph of the actual book copy is required.';
  if (!PHOTO_TYPES.includes(file.type)) return 'Photo must be a JPEG, PNG, or WebP image.';
  if (file.size > PHOTO_MAX_MB * 1024 * 1024) return `Photo must not exceed ${PHOTO_MAX_MB} MB.`;
  return null;
};

// Keep only the entries that hold a message.
export const onlyErrors = (errors) =>
  Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
