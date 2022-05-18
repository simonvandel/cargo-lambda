# cargo-lambda

[![crates.io][crate-image]][crate-link]
[![Build Status][build-image]][build-link]

cargo-lambda is a [Cargo](https://doc.rust-lang.org/cargo/) subcommand to help you work with AWS Lambda.

The [new](#new) subcommand creates a basic Rust package from a well defined template to help you start writing AWS Lambda functions in Rust.

The [build](#build) subcommand compiles AWS Lambda functions natively and produces artifacts which you can then [upload to AWS Lambda](#deploy) or use with other echosystem tools, like [SAM Cli](https://github.com/aws/aws-sam-cli) or the [AWS CDK](https://github.com/aws/aws-cdk).

The [watch](#watch) subcommand boots a development server that emulates interations with the AWS Lambda control plane. This subcommand also reloads your Rust code as you work on it.

The [invoke](#invoke) subcommand sends requests to the control plane emulator to test and debug interactions with your Lambda functions. This command can also be used to send requests to remote functions once deployed on AWS Lambda.

The [deploy](#deploy) subcommand uploads functions to AWS Lambda. You can use the same command to create new functions as well as update existent functions code.

## Installation

### With Homebrew

You can use Homebrew on MacOS and Linux to install cargo-lambda. Run the following commands on your terminal to add our tap and install cargo-lambda:

```
brew tap cargo-lambda/cargo-lambda
brew install cargo-lambda
```

### With PyPI

You can also use PyPI to install cargo-lambda:

```
pip install cargo-lambda
```

### With NPM

⚠️ Coming soon

Install cargo-lambda with NPM:

```
npm install -g cargo-lambda
```

### Building from source

Install cargo-lambda on your host machine with Cargo itself:

```
cargo install cargo-lambda
```

⚠️ cargo-install compiles the binary in your system, which usually takes several minutes.

### Downloading a prebuit binary

Go to the [releases](https://github.com/cargo-lambda/cargo-lambda/releases) page, and download a pre-built binary for your specific platform.

## Usage

### New

The `new` command creates new Rust packages with a basic scheleton to help you start writing AWS Lambda functions with Rust. This command will create this package in a new sub-directory inside the directory where it's invoked. Run `cargo lambda new PACKAGE-NAME` to generate your new package.

This command uses templates packed as zip files, or from local directories. The [default template](https://github.com/cargo-lambda/default-template) supports HTTP Lambda functions, as well as functions that receive events defined in the [aws_lambda_events crate](https://crates.io/crates/aws-lambda-events). You can provide your own template using the `--template` flag.

The files `Cargo.toml`, `README.md`, and `src/main.rs` in the template are parsed with [Liquid](https://crates.io/crates/liquid) to dynamically render different files based on a series of global variables. You can see all the variables in [the source code](https://github.com/cargo-lambda/cargo-lambda/blob/main/crates/cargo-lambda-new/src/lib.rs#L167-L178).

After creating a new package, you can use the [build](#build) command described below to compile the source code.

### Build

Within a Rust project that includes a `Cargo.toml` file, run the `cargo lambda build` command to natively compile your Lambda functions in the project.
The resulting artifacts such as binaries or zips, will be placed in the `target/lambda` directory.
This is an example of the output produced by this command:

```
❯ tree target/lambda
target/lambda
├── delete-product
│   └── bootstrap
├── dynamodb-streams
│   └── bootstrap
├── get-product
│   └── bootstrap
├── get-products
│   └── bootstrap
└── put-product
    └── bootstrap

5 directories, 5 files
```

#### Build - Output Format

By default, cargo-lambda produces a binary artifact for each Lambda functions in the project.
However, you can configure cargo-lambda to produce a ready to upload zip artifact.

The `--output-format` paramters controls the output format, the two current options are `zip` and `binary` with `binary` being the default.

Example usage to create a zip.

```
cargo lambda build --output-format zip
```

#### Build - Architectures

By default, cargo-lambda compiles the code for Linux X86-64 architectures, you can compile for Linux ARM architectures by providing the right target:

```
cargo lambda build --target aarch64-unknown-linux-gnu
```

ℹ️ Starting in version 0.6.2, you can use the shortcut `--arm64` to compile your functions for Linux ARM architectures:

```
cargo lambda build --arm64
```

#### Build - Compilation Profiles

By default, cargo-lambda compiles the code in `debug` mode. If you want to change the profile to compile in `release` mode, you can provide the right flag.

```
cargo lambda build --release
```

When you compile your code in release mode, cargo-lambda will strip the binaries from all debug symbols to reduce the binary size.

#### Build - Extensions

cargo-lambda can also build Lambda Extensions written in Rust. If you want to build a extension, use the flag `--extension` to put the output under `target/lambda/extensions`, so you don't mix extensions and functions.

```
cargo lambda build --release --extension
```

If you want to create a zip file with the structure that AWS Lambda expects to find extensions in, add the `--output-format` flag to the previous command, and cargo-lambda will zip the extensions directory with your extension inside.

```
cargo lambda build --release --extension --output-format zip
```

#### Build - How does it work?

cargo-lambda uses [Zig](https://ziglang.org) and [cargo-zigbuild](https://crates.io/crates/cargo-zigbuild)
to compile the code for the right architecture. If Zig is not installed in your host machine, the first time that your run cargo-lambda, it will guide you through some installation options. If you run cargo-lambda in a non-interactive shell, the build process will fail until you install that dependency.

### Watch

⚠️ This subcommand used to be called `start`. Both names still work, as `start` is an alias for `watch`.

The watch subcommand emulates the AWS Lambda control plane API. Run this command at the root of a Rust workspace and cargo-lambda will use cargo-watch to hot compile changes in your Lambda functions. Use flag `--no-reload` to avoid hot compilation.

⚠️ This command works best with the **[Lambda Runtime version 0.5.1](https://crates.io/crates/lambda_runtime/0.5.1)**. Previous versions of the rumtime are likely to crash with serialization errors.

```
cargo lambda watch
```

The function is not compiled until the first time that you try to execute it. See the [invoke](#invoke) command to learn how to execute a function. Cargo will run the command `cargo run --bin FUNCTION_NAME` to try to compile the function. `FUNCTION_NAME` can be either the name of the package if the package has only one binary, or the binary name in the `[[bin]]` section if the package includes more than one binary.

#### Watch - Environment variables

If you need to set environment variables for your function to run, you can specify them in the metadata section of your Cargo.toml file.

Use the section `package.metadata.lambda.env` to set global variables that will applied to all functions in your package:

```toml
[package]
name = "basic-lambda"

[package.metadata.lambda.env]
RUST_LOG = "debug"
MY_CUSTOM_ENV_VARIABLE = "custom value"
```

If you have more than one function in the same package, and you want to set specific variables for each one of them, you can use a section named after each one of the binaries in your package, `package.metadata.lambda.bin.BINARY_NAME`:

```toml
[package]
name = "lambda-project"

[package.metadata.lambda.env]
RUST_LOG = "debug"

[package.metadata.lambda.bin.get-product.env]
GET_PRODUCT_ENV_VARIABLE = "custom value"

[package.metadata.lambda.bin.add-product.env]
ADD_PRODUCT_ENV_VARIABLE = "custom value"

[[bin]]
name = "get-product"
path = "src/bin/get-product.rs"

[[bin]]
name = "add-product"
path = "src/bin/add-product.rs"
```

#### Watch - Function URLs

The emulator server includes support for [Lambda function URLs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html) out of the box. Since we're working locally, these URLs are under the `/lambda-url` path instead of under a subdomain. The function that you're trying to access through a URL must respond to Request events using [lambda_http](https://crates.io/crates/lambda_http/), or raw `ApiGatewayV2httpRequest` events.

You can create functions compatible with this feature by running `cargo lambda new --http FUNCTION_NAME`.

To access a function via its HTTP endpoint, start the watch subcommand `cargo lambda watch`, then send requests to the endpoint `http://localhost:9000/lambda-url/FUNCTION_NAME`. You can add any additional path after the function name, or any query parameters.


### Invoke

The invoke subcomand helps you send requests to the control plane emulator, as well as remote functions.

If your Rust project only includes one function, in the package's main.rs file, you can invoke it by sending the data that you want to process, without extra arguments. For example:

```
$ cargo lambda invoke --data-ascii '{"command": "hi"}'
```

If your project includes more than one function, or the binary has a different name than the package, you must provide the name of the Lambda function that you want to invoke, and the payload that you want to send. If you don't know how to find your function's name, it can be in two places:

- If your Cargo.toml file includes a `[package]` section, and it does **not** include a `[[bin]]` section, the function's name is in the `name` attribute under the `[package]` section.
- If your Cargo.toml file includes one or more `[[bin]]` sections, the function's name is in the `name` attribute under the `[[bin]]` section that you want to compile.

In the following example, `basic-lambda` is the function's name as indicated in the package's `[[bin]]` section:

```
$ cargo lambda invoke basic-lambda --data-ascii '{"command": "hi"}'
```

Cargo-Lambda compiles functions on demand when they receive the first invocation. It's normal that the first invocation takes a long time if your code has not compiled with the host compiler before. After the first compilation, Cargo-Lambda will re-compile your code every time you make a change in it, without having to send any other invocation requests.

#### Invoke - Ascii data

The `--data-ascii` flag allows you to send a payload directly from the command line:

```
cargo lambda invoke basic-lambda --data-ascii '{"command": "hi"}'
```

#### Invoke - File data

The `--data-file` flag allows you to read the payload from a file in your file system:

```
cargo lambda invoke basic-lambda --data-file examples/my-payload.json
```

#### Invoke - Example data

The `--data-example` flag allows you to fetch an example payload from the [aws-lambda-events repository](https://github.com/LegNeato/aws-lambda-events/), and use it as your request payload. For example, if you want to use the [example-apigw-request.json](https://github.com/LegNeato/aws-lambda-events/blob/master/aws_lambda_events/src/generated/fixtures/example-apigw-request.json) payload, you have to pass the name `apigw-request` into this flag:

```
cargo lambda invoke http-lambda --data-example apigw-request
```

After the first download, these examples are cached in your home directory, under `.cargo/lambda/invoke-fixtures`.

#### Invoke - Remote

The `--remote` flag allows you to send requests to a remote function deployed on AWS Lambda. This flag assumes that your AWS account has permission to call the `lambda:invokeFunction` operation. You can specify the region where the function is deployed, as well as any credentials profile that the command should use to authenticate you:

```
cargo lambda invoke --remote --data-example apigw-request http-lambda
```

#### Invoke - Output format

The `--output-format` flag allows you to change the output formatting between plain text and pretty-printed JSON formatting. By default, all function outputs are printed as text.

```
cargo lambda invoke --remote --data-example apigw-request --output-format json http-lambda
```

### Deploy

This subcommand uploads functions to AWS Lambda. You can use the same command to create new functions as well as update existent functions code. This command assumes that your AWS account has permissions to call several lambda operations, like `lambda:getFunction`, `lambda:createFunction`, and `lambda:updateFunctionCode`. This subcommand also requires an IAM role with privileges in AWS Lambda.

When you call this subcommand, the function binary must have been created with the [Build](#build) subcommand ahead of time. The command will fail if it cannot find the binary file.

This command automatically detects the architecture that the binary was compiled for, so you don't have to specify it.

The example below deploys a function that has already been compiled with the default flags:

```
cargo lambda deploy --iam-role FULL_ROLE_ARN http-lambda
```

#### Deploy - Function URLs

This subcommand can enable Lambda function URLs for your lambda. Use the flag `--enable-function-url` when you deploy your function, and when the operation completes, the command will print the function URL in the terminal.

⚠️ This flag always configures the function URL without any kind of authorization. Don't use it if you'd like to keep the URL secure.

The example below shows how to enable the function URL for a function during deployment:

```
cargo lambda deploy --iam-role FULL_ROLE_ARN --enable-function-url http-lambda
```

You can use the flag `--disable-function-url` if you want to disable the function URL.

#### Deploy - Environment variables

You can add environment variables to a function during deployment with the flags `--env-var` and `--env-file`.

The flag `--env-var` allows you to pass several variables in the command like with the format `KEY=VALUE`:

```
cargo lambda deploy --iam-role FULL_ROLE_ARN \
  --env-var FOO=BAR --env-var BAZ=QUX \
  http-lambda
```

The flag `--env-file` will read the variables from a file and add them to the function during the deploy. Each variable in the file must be in a new line with the same `KEY=VALUE` format:

```
cargo lambda deploy --iam-role FULL_ROLE_ARN --env-file .env http-lambda
```

#### Deploy - Extensions

cargo-lambda can deploy Lambda Extensions built in Rust by adding the `--extension` flag to the `deploy` command. This command requires you to build the extension first with the same `--extension` flag in the `build` command:

```
cargo lambda build --release --extension
cargo lambda deploy --extension
```

#### Deploy - Other options

Use the `--help` flag to see other options to configure the function's deployment.

#### Deploy - State management

⚠️ The deploy command doesn't use any kind of state management. If you require state management, you should use tools like [SAM Cli](https://github.com/aws/aws-sam-cli) or the [AWS CDK](https://github.com/aws/aws-cdk).

If you modify a flag and run the deploy command twice for the same function, the change will be updated in the function's configuration in AWS Lambda.

## Rust version

This project works with Rust 1.59 and above.

[//]: # 'badges'
[crate-image]: https://img.shields.io/crates/v/cargo-lambda.svg
[crate-link]: https://crates.io/crates/cargo-lambda
[build-image]: https://github.com/cargo-lambda/cargo-lambda/workflows/Build/badge.svg
[build-link]: https://github.com/cargo-lambda/cargo-lambda/actions?query=workflow%3ACI+branch%3Amain
