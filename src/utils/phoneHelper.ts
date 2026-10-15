import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import crypto from 'crypto';
import { getCountryByCode } from '@/config/countryGlossary.js';

export const formatAndValidatePhone = (
    phone: string,
    countryCode: CountryCode = 'BD'
): { isValid: boolean; e164?: string; message?: string } => {
    try {
        if (!phone || typeof phone !== 'string') {
            return { isValid: false, message: "Phone number is required." };
        }

        const cleanPhone = phone.trim();
        const countryInfo = getCountryByCode(countryCode);


        const phoneNumber = parsePhoneNumberFromString(cleanPhone, countryCode);

        if (!phoneNumber) {
            return { isValid: false, message: "Invalid phone number structure." };
        }


        const nationalNumber = phoneNumber.nationalNumber;
        if (countryInfo) {
            if (nationalNumber.length < countryInfo.minLength || nationalNumber.length > countryInfo.maxLength) {
                if (countryInfo.minLength === countryInfo.maxLength) {
                    return {
                        isValid: false,
                        message: `Phone number for ${countryInfo.name} must be exactly ${countryInfo.minLength} digits.`
                    };
                } else {
                    return {
                        isValid: false,
                        message: `Phone number for ${countryInfo.name} must be between ${countryInfo.minLength} and ${countryInfo.maxLength} digits.`
                    };
                }
            }
        }


        if (!phoneNumber.isValid()) {
            return { isValid: false, message: `Invalid phone number for ${countryInfo?.name || countryCode}.` };
        }

        return {
            isValid: true,
            e164: phoneNumber.number
        };

    } catch (error) {
        return { isValid: false, message: "Failed to validate phone number." };
    }
};

export const generate6DigitOtp = (): string => {
    return crypto.randomInt(100000, 999999).toString();
};