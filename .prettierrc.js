module.exports = {
    overrides: [
      {
        files: "*.sol",
        options: {
          bracketSpacing: false,
          printWidth: 145,
          /* tabWidth: 4,*/
          useTabs: false,
          singleQuote: true,
          explicitTypes: "always",
        },
      },
      {
        files: "*.ts",
        options: {
          printWidth: 145,
          semi: false,
          trailingComma: "es5",
        },
      },
    ],
  }