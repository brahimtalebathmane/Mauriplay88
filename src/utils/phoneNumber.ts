export const sanitizePhoneNumber = (input: string): string => {
  let digitsOnly = input.replace(/\D/g, '');

  if (digitsOnly.startsWith('222')) {
    digitsOnly = digitsOnly.slice(3);
  }

  digitsOnly = digitsOnly.slice(0, 8);

  return '222' + digitsOnly;
};

export const formatPhoneForDisplay = (phone: string): string => {
  if (phone.startsWith('222')) {
    return `+222 ${phone.slice(3)}`;
  }
  return phone;
};

export const formatPhoneInput = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, '');
  return digitsOnly.slice(0, 8);
};

export const validateMauritanianPhone = (phone: string): boolean => {
  const phoneRegex = /^222[234][0-9]{7}$/;
  return phoneRegex.test(phone);
};
