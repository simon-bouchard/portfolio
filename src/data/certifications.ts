// src/data/certifications.ts
export type Certification = {
    name: string;
    issuer: string;
    badge: string;       // path to badge image
    issued: string;      // e.g., "Jan 2026"
    details?: string;    // e.g., "Score: 890/1000" or "Early Adopter (Top 5000)"
    verifyUrl: string;
};

export const certifications: Certification[] = [
    {
        name: "AWS Certified Machine Learning - Specialty",
        issuer: "Amazon Web Services",
        badge: "/certs/aws-ml-specialty.png",
        issued: "Jan 2026",
        details: "Score: 890/1000",
        verifyUrl: "https://www.credly.com/badges/093b5536-77d5-4cd8-9438-ab01d243f937/public_url",
    },
    {
        name: "AWS Certified Generative AI - Professional",
        issuer: "Amazon Web Services",
        badge: "/certs/aws-genai-professional.png",
        issued: "Jan 2026",
        details: "Early Adopter (First 5000)",
        verifyUrl: "https://www.credly.com/badges/14152771-4670-4cc0-92b4-08a3501bfe52/public_url",
    },
];

