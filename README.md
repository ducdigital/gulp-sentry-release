# gulp-sentry-release

[![NPM](https://nodei.co/npm/gulp-sentry-release.png?compact=true)](https://nodei.co/npm/gulp-sentry-release/)

gulp-sentry-release facillitate the process of upload your sourcemaps / min files to sentry.
Also it provide an easy way to create and delete your version.

## Why use it
Pain in the ass using curl to upload file.

## Install
```
npm install gulp-sentry-release --save-dev
```

##  How do I use this awesome gulp plugin?

Go to sentry and create an API Key.

Include this in your gulp file:

```js
var opt = {
	DOMAIN: '', // prefix domain in the `name` param when upload file. Leave blank to use path. Do not add trailing slash
	API_URL: 'https://app.getsentry.com/api/0/projects/ORGANIZATION/PROJECT/',
	API_KEY: 'MY_LONG_API_KEY',
	debug: true ,
	versionPrefix: '', // Append before the version number in package.json
}
var sentryRelease = require('gulp-sentry-release')('./package.json', opt);
```

## Some gulp task you can use

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
	.pipe(sentryRelease.release());
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
Pipe all your file stream and upload it to sentry
Leave blank version will use package.json version

### `sentryRelease.deleteVersion(version)`
Delete a version

### `sentryRelease.createVersion(version)`
Delete a version

### `sentryRelease.sentryAPI`
Sentry API Request Wrapper
 - `create(version, cb(err, res, body))`
 - `delete(version, cb(err, res, body))`
 - `upload(version, file, cb(err, res, body))`


## Contribute
If you think it would make sense to add some features/methods don't hesitate to fork and
make pull requests.

## Licence
Distributed under the MIT License.
