var through      = require('through2');
var fs           = require('fs');
var request      = require('request');
var slash        = require('slash');
var gutil        = require('gulp-util');
var PluginError  = gutil.PluginError;


module.exports = function (packageFile, opt) {
	if (!opt || !opt.API_KEY || !opt.API_URL) {
		throw new PluginError("gulp-sentry-release", "Require options API_KEY and API_URL");
	}
	if (!!opt.versionPrefix) {
		version = opt.versionPrefix + version;
	}

	var packageJSON = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
	var version = packageJSON.version;
	var API_URL = opt.API_URL.replace(/\/$/, "") + '/releases/';
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
					user: API_KEY
				},
				form: {
					version: version
				}
			}, cb);
		},
		delete: function (version, cb) {
			return request.del({
				uri: API_URL+version+'/',
				headers: {
					'Content-Type': 'application/json'
				},
				auth: {
					user: API_KEY
				}
			}, cb);
		},
		upload: function (version, file, cb){
			var VERSION_URL = API_URL + version + '/files/';
			return request.post({
				uri: VERSION_URL,
				headers: {
					'Content-Type': 'application/json'
				},
				auth: {
					user: API_KEY
				},
				formData: {
					file:  fs.createReadStream(file.path),
					name: (!!opt.DOMAIN ? opt.DOMAIN : '') + '/' + slash(file.relative)
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

				gutil.log('Start uploading to sentry...');
				cb();
			});
		};

		var processFile = function (file, cb) {
			sentryAPI.upload(ver, file, function (err, res, body){
				if (err) {
					gutil.log(err);
				}
				var errMsg = "";

				if (res.statusCode >= 400) {
					failedCount++;
					errMsg = (res.statusCode === 409) ? "File existed" : "File upload failed";
				}

				if (opt.debug) {
					gutil.log(file.relative + " | " + body + " | " + errMsg);
				} else {
					process.stdout.write('.');
				}
				cb(null, file);
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
			gutil.log('In which ' + failedCount + ' files failed to upload or already uploaded before');
			cb();
		};

		return through.obj(streamProcess, streamEnd);
	};

	/***************************************************************************
	*  Delete a version
	***************************************************************************/
	var deleteVersion = function (version) {

		if (!version) {
			throw new PluginError("gulp-sentry-release.deleteVersion(version)", "Require version to delete");
		}

		return through.obj(function (file, enc, cb) {
			// Pass through
			return cb(null, file);
		}, function (cb) {
			sentryAPI.delete(version, function (err, res, body){
				if (err) {
					gutil.log(err);
				}
				if (res.statusCode === 404) {
					throw new PluginError("gulp-sentry-release.deleteVersion(version)", "Server return error 404: Version not found. " + body);
				}
				gutil.log('Deleted version: ' + version);
				cb();
			});
		});
	};
	/***************************************************************************
	*  Create a version
	***************************************************************************/
	var createVersion = function (version) {
		if (!version) {
			throw new PluginError("gulp-sentry-release.createVersion(version)", "Require version to create");
		}

		return through.obj(function (file, enc, cb) {
			// Pass through
			return cb(null, file);
		}, function (cb) {
			sentryAPI.create(version, function (err, res, body){
				if (err) {
					gutil.log(err);
				}
				if (res.statusCode >= 400) {
					throw new PluginError("gulp-sentry-release.createVersion(version)", "Version existed. " + body);
				}
				gutil.log('Created version: ' + version);
				cb();
			});
		});
	};

	/***************************************************************************
	*  Finally, our plugin exported
	***************************************************************************/
	return {
		release: release,
		deleteVersion: deleteVersion,
		createVersion: createVersion,
		sentryAPI: sentryAPI
	};
};
