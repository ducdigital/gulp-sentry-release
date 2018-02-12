var through      = require('through2');
var fs           = require('fs');
var request      = require('request');
var slash        = require('slash');
var gutil        = require('gulp-util');
var PluginError  = gutil.PluginError;


module.exports = function (packageFile, opt) {
	if (typeof packageFile === 'object' && packageFile && !opt) {
		opt = packageFile;
		packageFile = null;
	}

	if (!opt || !opt.API_KEY || !opt.API_URL) {
		throw new PluginError(
			'gulp-sentry-release',
			'The API_KEY and API_URL options are required'
		);
	}

	if (!opt.versionPrefix) {
		opt.versionPrefix = '';
	}

	var version = opt.versionPrefix + opt.version;;

	if (packageFile) {
		version =
			opt.versionPrefix +
			JSON.parse(fs.readFileSync(packageFile, 'utf8')).version;
	}

	if (!version) {
		throw new PluginError(
			'gulp-sentry-release',
			'A version string is required'
		);
	}

	var API_URL = opt.API_URL.replace(/\/?$/, '/releases/');
	var API_KEY = opt.API_KEY;
	var streamCount = 0;
	var failedCount = 0;

	/***************************************************************************
	*  Sentry API Request wrapper
	***************************************************************************/
	var sentryAPI = {
		create: function (version, cb) {
			return request.post({
				uri: API_URL,
				headers: {
					'Content-Type': 'application/json'
				},
				auth: {
					bearer: API_KEY
				},
				form: {
					version: version
				}
			}, cb);
		},
		delete: function (version, cb) {
			return request.del({
				uri: API_URL + version + '/',
				headers: {
					'Content-Type': 'application/json'
				},
				auth: {
					bearer: API_KEY
				}
			}, cb);
		},
		upload: function (version, file, cb){
			return request.post({
				uri: API_URL + version + '/files/',
				headers: {
					'Content-Type': 'application/json'
				},
				auth: {
					bearer: API_KEY
				},
				formData: {
					file: {
						value: file.contents,
						options: {
							filename: file.relative
						}
					},
					name: (opt.DOMAIN || '~') + '/' + slash(file.relative)
				}
			}, cb);
		}
	};

	/***************************************************************************
	*  Upload a release
	***************************************************************************/
	var release = function (v) {
		var ver = v || version;
		var init = function (cb) {
			sentryAPI.create(ver, function (err, res, body){
				if (err) {
					gutil.log(err);
				}
				if (res.statusCode >= 400) {
					gutil.log('Version existed: ' + ver);
				} else {
					gutil.log('Created version: ' + ver);
				}

				gutil.log('Starting upload to sentry...');
				return cb();
			});
		};

		var processFile = function (file, cb) {
			sentryAPI.upload(ver, file, function (err, res, body){
				if (err) {
					gutil.log(err);
				}

				var errMsg = '';

				if (res.statusCode >= 400) {
					failedCount++;
					errMsg = (res.statusCode === 409) ?
						'File already exists' : 'File upload failed';
				}

				if (opt.debug) {
					gutil.log(file.relative + ' | ' + body + ' | ' + errMsg);
				} else {
					process.stdout.write('.');
				}
				return cb(null, file);
			});

		};

		var streamProcess = function (file, enc, cb) {
			if (streamCount === 0) {
				init(function () {
					processFile(file, cb);
				});
			} else {
				processFile(file, cb);
			}
			streamCount++;
		};

		var streamEnd = function (cb){
			gutil.log('Processed ' + streamCount + ' files');
			gutil.log(
				'In which ' + failedCount +
				' files failed to upload or already existed'
			);
			return cb();
		};

		return through.obj(streamProcess, streamEnd);
	};

	/***************************************************************************
	*  Delete a version
	***************************************************************************/
	var deleteVersion = function (version) {
		if (!version) {
			throw new PluginError(
				'gulp-sentry-release.deleteVersion(version)',
				'Requires version to delete'
			);
		}

		return through.obj(function (file, enc, cb) {
			// Passthrough
			return cb(null, file);
		}, function (cb) {
			sentryAPI.delete(version, function (err, res, body){
				if (err) {
					gutil.log(err);
				}

				if (res.statusCode === 404) {
					throw new PluginError(
						'gulp-sentry-release.deleteVersion(version)',
						'Server return error 404: Version not found. ' + body
					);
				}

				gutil.log('Deleted version: ' + version);

				return cb();
			});
		});
	};

	/***************************************************************************
	*  Create a version
	***************************************************************************/
	var createVersion = function (version) {
		if (!version) {
			throw new PluginError(
				'gulp-sentry-release.createVersion(version)',
				'Requires version to create'
			);
		}

		return through.obj(function (file, enc, cb) {
			// Passthrough
			return cb(null, file);
		}, function (cb) {
			sentryAPI.create(version, function (err, res, body){
				if (err) {
					gutil.log(err);
				}

				if (res.statusCode >= 400) {
					throw new PluginError(
						'gulp-sentry-release.createVersion(version)',
						'Version already existed. ' + body
					);
				}

				gutil.log('Created version: ' + version);

				return cb();
			});
		});
	};

	/***************************************************************************
	*  Finally, export the plugin
	***************************************************************************/
	return {
		release: release,
		deleteVersion: deleteVersion,
		createVersion: createVersion,
		sentryAPI: sentryAPI
	};
};
