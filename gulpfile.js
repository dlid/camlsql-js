
var gulp = require("gulp");
var concat = require("gulp-concat");
var clean = require('gulp-clean');
var inject = require('gulp-inject-string');
var minify = require('gulp-minify');
var wrap = require('gulp-wrap');
var path = require('path');
var runSequence = require('run-sequence');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync').create();
var less = require('gulp-less');
var rename = require('gulp-rename');
var cssmin = require('gulp-cssmin');
var copy = require('gulp-copy');
var indent = require("gulp-indent");
var reload      = browserSync.reload;
var replace = require('gulp-string-replace');
var fs = require('fs');
var package = JSON.parse(fs.readFileSync('./package.json'));

var script_header = function () 
{    var headerComment = "/*! camlsql v" + package.version + " (https://github.com/dlid/camlsql-js) */\n",
        containerStart = "",
        containerEnd = "";



    return [headerComment + containerStart, containerEnd];
}
 
gulp.task('build-clean', function () {
    return gulp.src('./dist/**/*.*')
        .pipe(clean());
});


gulp.task('serve-watch', function() {  
    gulp.watch('src/**/*.js' , ['build-js', 'build-app-js']);
    gulp.watch('src/**/*.html' , ['copy-html']);
    gulp.watch('src/less/*.less' , ['build-less']);
});

gulp.task('serve-serve', function () {
 
    // Serve files from the root of this project
    browserSync.init({
        server: {
            baseDir: "./dist/"
        },
        reloadDelay : 2000
    }); 
     gulp.watch("./dist/css/*.css").on('change', reload);
     gulp.watch("./dist/*.html").on('change', reload);
     gulp.watch("./dist/**/*.js").on('change', reload);
});

gulp.task('build-js',  function () { //['build-clean'],
    return gulp.src([
        'src/camlsql-js/header.js',
        'src/camlsql-js/where-parser.js',
        'src/camlsql-js/orderby-parser.js',
        'src/camlsql-js/sp-exec.js',
        'src/camlsql-js/index.js',
        'src/camlsql-js/footer.js',
        'src/camlsql-js/help-functions.js'
    ])
   // .pipe(sourcemaps.init())
    .pipe(wrap("\n\n\t/* File: <%= file.path %>  */\n<%= contents %>\n"))
    .pipe(concat('camlsql.js'))
    .pipe(inject.wrap(script_header()[0], script_header()[1]))
    // .pipe(jshint())
   //  .pipe(jshint.reporter('default'))

    // .pipe(indent({
    //     tabs: false,
    //     amount: 2
    // }))
     .pipe(gulp.dest('dist/js'))
    //.pipe(gulp.dest('releases/' + package.version))
    .pipe(minify({
        ext: {
            min: '.min.js'
        }
    }))
    // //.pipe(sourcemaps.write("dist/js"))
    .pipe(gulp.dest('dist/js'));
    //.pipe(gulp.dest('releases/' + package.version));
});

gulp.task('build-app-js',  function () { //['build-clean'],
    return gulp.src([
        'src/app/js/vendor/q-1.5.1/q.js',
        'node_modules/clipboard/dist/clipboard.min.js',
        'src/app/js/vendor/vkbeautify/vkbeautify.0.99.00.beta.js',
        'src/app/js/vendor/lz-string/lz-string.min.js',
        'src/app/js/vendor/vue/vue.min.js',
        'src/app/js/vendor/vue-router/vue-router.js',
        'src/app/js/managers/*.js',
        'src/app/js/vue/directives/*.js',
        'src/app/js/vue/components/*.js',
        'src/app/js/start.js'
    ])
   // .pipe(sourcemaps.init())
    .pipe(wrap("\n\n\t/* File: <%= file.path %>  */\n<%= contents %>\n"))
    .pipe(concat('app.js'))
    .pipe(inject.wrap(script_header()[0], script_header()[1]))
    // .pipe(jshint())
   //  .pipe(jshint.reporter('default'))

    .pipe(indent({
        tabs: false,
        amount: 2
    }))
     .pipe(gulp.dest('dist/js'))
    .pipe(minify({
        ext: {
            min: '.min.js'
        }
    }))
    // //.pipe(sourcemaps.write("dist/js"))
    .pipe(gulp.dest('dist/js'));
});
gulp.task('copy-html', function () {
    return gulp.src(['src/app/*.html'])
    .pipe(replace(/<%package.version%>/, package.version))
    .pipe(gulp.dest('./dist/'));
});
gulp.task('copy-img', function () {
    return gulp.src(['src/app/img/*.*'])
    .pipe(replace(/<%package.version%>/, package.version))
    .pipe(gulp.dest('./dist/img'));
});


/* Task to compile less */
gulp.task('build-less', function() {  
  gulp.src('./src/app/app.less')
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./dist/css/'))
     .pipe(cssmin().on('error', function(err) {
        console.log(err);
    }))
     .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('./dist/css/'));
}); 


gulp.task('default', function(cb) {
  runSequence('build-clean', ['build-app-js', 'build-js', 'build-less', 'copy-html', 'copy-img'], cb);
});

gulp.task("serve", ['serve-watch', 'serve-serve']);
