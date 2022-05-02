export const urlValidator = (s: string) => {
    // Basically just call the constructor for URL.
    // If this is invalid, it will throw.
    new URL(s);
};
