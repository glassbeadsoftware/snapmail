module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": ['./tsconfig.json'],
        "tsconfigRootDir": __dirname,
        "ecmaVersion": 12,
        "sourceType": "module"
    },
    "ignorePatterns": ["src/bindings/*.ts", "dist/*"],
    "plugins": [
        "@typescript-eslint"
    ],
    "rules": {
        "@typescript-eslint/no-this-alias": "off",
        "@typescript-eslint/no-empty-function": "off",
    }
};
