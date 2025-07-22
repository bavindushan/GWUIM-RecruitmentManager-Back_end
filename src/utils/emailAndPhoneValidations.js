const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

const isValidPhoneNumber = (phone) => {
    const regex = /^0\d{9}$/;
    return regex.test(phone);
};

module.exports = { isValidEmail, isValidPhoneNumber };