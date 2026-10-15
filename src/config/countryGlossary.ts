import { type CountryCode } from 'libphonenumber-js';

export interface ICountryInfo {
    name: string;
    code: CountryCode;
    dialCode: string;
    flag: string;
    formatPlaceholder: string;
    minLength: number;
    maxLength: number;
    nationalPrefix?: string;
}

export const POPULAR_COUNTRIES: ICountryInfo[] = [
    {
        name: "Bangladesh",
        code: "BD",
        dialCode: "+880",
        flag: "🇧🇩",
        formatPlaceholder: "01712-345678",
        minLength: 10, 
        maxLength: 10,
        nationalPrefix: "0"
    },
    {
        name: "India",
        code: "IN",
        dialCode: "+91",
        flag: "🇮🇳",
        formatPlaceholder: "98765-43210",
        minLength: 10,
        maxLength: 10
    },
    {
        name: "United States",
        code: "US",
        dialCode: "+1",
        flag: "🇺🇸",
        formatPlaceholder: "(555) 000-0000",
        minLength: 10,
        maxLength: 10
    },
    {
        name: "United Kingdom",
        code: "GB",
        dialCode: "+44",
        flag: "🇬🇧",
        formatPlaceholder: "7911 123456",
        minLength: 10,
        maxLength: 10,
        nationalPrefix: "0"
    },
    {
        name: "Canada",
        code: "CA",
        dialCode: "+1",
        flag: "🇨🇦",
        formatPlaceholder: "(555) 000-0000",
        minLength: 10,
        maxLength: 10
    },
    {
        name: "United Arab Emirates",
        code: "AE",
        dialCode: "+971",
        flag: "🇦🇪",
        formatPlaceholder: "50 123 4567",
        minLength: 9,
        maxLength: 9,
        nationalPrefix: "0"
    },
    {
        name: "Saudi Arabia",
        code: "SA",
        dialCode: "+966",
        flag: "🇸🇦",
        formatPlaceholder: "50 123 4567",
        minLength: 9,
        maxLength: 9,
        nationalPrefix: "0"
    },
    {
        name: "Pakistan",
        code: "PK",
        dialCode: "+92",
        flag: "🇵🇰",
        formatPlaceholder: "300 1234567",
        minLength: 10,
        maxLength: 10,
        nationalPrefix: "0"
    },
    {
        name: "Germany",
        code: "DE",
        dialCode: "+49",
        flag: "🇩🇪",
        formatPlaceholder: "151 12345678",
        minLength: 10,
        maxLength: 11,
        nationalPrefix: "0"
    },
    {
        name: "France",
        code: "FR",
        dialCode: "+33",
        flag: "🇫🇷",
        formatPlaceholder: "6 12 34 56 78",
        minLength: 9,
        maxLength: 9,
        nationalPrefix: "0"
    },
    {
        name: "Australia",
        code: "AU",
        dialCode: "+61",
        flag: "🇦🇺",
        formatPlaceholder: "412 345 678",
        minLength: 9,
        maxLength: 9,
        nationalPrefix: "0"
    },
    {
        name: "Singapore",
        code: "SG",
        dialCode: "+65",
        flag: "🇸🇬",
        formatPlaceholder: "8123 4567",
        minLength: 8,
        maxLength: 8
    },
    {
        name: "Malaysia",
        code: "MY",
        dialCode: "+60",
        flag: "🇲🇾",
        formatPlaceholder: "12-345 6789",
        minLength: 9,
        maxLength: 10,
        nationalPrefix: "0"
    },
    {
        name: "Turkey",
        code: "TR",
        dialCode: "+90",
        flag: "🇹🇷",
        formatPlaceholder: "501 234 56 78",
        minLength: 10,
        maxLength: 10,
        nationalPrefix: "0"
    },
    {
        name: "Japan",
        code: "JP",
        dialCode: "+81",
        flag: "🇯🇵",
        formatPlaceholder: "90 1234 5678",
        minLength: 10,
        maxLength: 10,
        nationalPrefix: "0"
    },
    {
        name: "South Korea",
        code: "KR",
        dialCode: "+82",
        flag: "🇰🇷",
        formatPlaceholder: "10 1234 5678",
        minLength: 9,
        maxLength: 10,
        nationalPrefix: "0"
    },
    {
        name: "Italy",
        code: "IT",
        dialCode: "+39",
        flag: "🇮🇹",
        formatPlaceholder: "312 345 6789",
        minLength: 9,
        maxLength: 10
    },
    {
        name: "Spain",
        code: "ES",
        dialCode: "+34",
        flag: "🇪🇸",
        formatPlaceholder: "612 34 56 78",
        minLength: 9,
        maxLength: 9
    },
    {
        name: "Brazil",
        code: "BR",
        dialCode: "+55",
        flag: "🇧🇷",
        formatPlaceholder: "(11) 91234-5678",
        minLength: 10,
        maxLength: 11
    },
    {
        name: "Qatar",
        code: "QA",
        dialCode: "+974",
        flag: "🇶🇦",
        formatPlaceholder: "3312 3456",
        minLength: 8,
        maxLength: 8
    }
];

export const getCountryByCode = (code: string): ICountryInfo | undefined => {
    return POPULAR_COUNTRIES.find(c => c.code.toUpperCase() === code.toUpperCase());
};

export const getCountryByDialCode = (dialCode: string): ICountryInfo | undefined => {
    return POPULAR_COUNTRIES.find(c => c.dialCode === dialCode);
};