# gulp-sentry-release

[![npm](https://nodei.co/npm/gulp-sentry-release.png?compact=true)](https://nodei.co/npm/gulp-sentry-release/)

gulp-sentry-release facilitates uploading your sourcemaps and minified files to Sentry.
It also provides a simple API for creating and deleting new releases.

## Why use it

Simplify your release process when using Sentry releases with gulp.

## Install

```
npm install gulp-sentry-release --save-dev
```

## How do I use this awesome gulp plugin?

Go to sentry and create an API Key.

Include this in your gulp file:

```js
var opt = {
	// prefix domain in the `name` param when uploading a file. Leave blank to use the path
	// verbatim. Do not include a trailing slash.
	DOMAIN: '',
	API_URL: 'https://app.getsentry.com/api/0/projects/ORGANIZATION/PROJECT/',
	API_KEY: 'MY_LONG_API_KEY',
	debug: true,
	versionPrefix: '' // Append before the version number in package.json
}

// Pull the version from the package.json file.
var sentryRelease = require('gulp-sentry-release')('./package.json', opt);

// Specify the version directly.
var sentryRelease = require('gulp-sentry-release')({
	API_URL: 'https://app.getsentry.com/api/0/projects/ORGANIZATION/PROJECT/',
	API_KEY: 'MY_LONG_API_KEY',
	version: 'v0.1.7' // If specified, uses this version number.
});
```

## Some gulp tasks you can use

```js
var gutil = require('gulp-util');
var sentrySrc = [
	'./path/to/public/js/**/*.js',
];

/*
	gulp sentry:release // Use package.json version
	gulp sentry:release -v 'version'
	gulp sentry:release --version 'version'
*/
gulp.task('sentry:release', function () {
	var version = gutil.env.version || gutil.env.v;
	return gulp.src(sentrySrc, { base: './path/to/public' })
		.pipe(sentryRelease.release(version));
});

/*
	gulp sentry:delete -v 'version'
	gulp sentry:delete --version 'version'
*/
gulp.task('sentry:delete', function () {
	var version = gutil.env.version || gutil.env.v;
	return gulp.src(sentrySrc, { base: './path/to/public' })
		.pipe(sentryRelease.deleteVersion(version));
});

/*
	gulp sentry:create -v 'version'
	gulp sentry:create --version 'version'
*/
gulp.task('sentry:create', function () {
	var version = gutil.env.version || gutil.env.v;
	return gulp.src(sentrySrc, { base: './path/to/public' })
		.pipe(sentryRelease.createVersion(version));
});
```

## API

### `sentryRelease.release(version)`
Pipe your entire file stream and upload it to sentry
Omit the version to fall baak to the package.json version

### `sentryRelease.deleteVersion(version)`

Delete a version

### `sentryRelease.createVersion(version)`
Create a version

### `sentryRelease.sentryAPI`

Sentry API Request Wrapper
 - `create(version, cb(err, res, body))`
 - `delete(version, cb(err, res, body))`
 - `upload(version, file, cb(err, res, body))`


## Contribute

If you think it would make sense to add some features/methods, don't hesitate to fork and
make pull requests.

## Licence

Distributed under the MIT License.
