var SERVER = 'http://code-compiler-service-stage.us-east-1.elasticbeanstalk.com'

var PROGRAMS = [
	'/%23include%20%22Quirkbot.h%22%0A%0AWave%20wave1%3B%0AWave%20wave2%3B%0ALed%20led1%3B%0ALed%20led2%3B%0AServoMotor%20servoMotor1%3B%0A%0Avoid%20setup()%7B%0A%09wave1.length%20%3D%201%3B%0A%09wave1.type%20%3D%20WAVE_SINE%3B%0A%09wave1.min%20%3D%200%3B%0A%09wave1.max%20%3D%201%3B%0A%09wave1.offset%20%3D%200%3B%0A%0A%09wave2.length%20%3D%200.25%3B%0A%09wave2.type%20%3D%20WAVE_SINE%3B%0A%09wave2.min%20%3D%200%3B%0A%09wave2.max%20%3D%201%3B%0A%09wave2.offset%20%3D%200%3B%0A%0A%09led1.light.connect(wave1.out)%3B%0A%09led1.place%20%3D%20LE%3B%0A%0A%09led2.light.connect(wave2.out)%3B%0A%09led2.place%20%3D%20RE%3B%0A%0A%09servoMotor1.position.connect(wave1.out)%3B%0A%09servoMotor1.place%20%3D%20SERVO_MOTOR_1%3B%0A%7D%0A%0Avoid%20loop()%7B%0A%0A%7D%0A',
	'/%23include%20%22Quirkbot.h%22%0A%0ARandomizer%20randomizer1%3B%0ARandomizer%20randomizer2%3B%0AWave%20wave1%3B%0AWave%20wave2%3B%0ALed%20led1%3B%0ALed%20led2%3B%0AServoMotor%20servoMotor1%3B%0AServoMotor%20servoMotor2%3B%0A%0Avoid%20setup()%7B%0A%09randomizer1.interval%20%3D%200.25%3B%0A%09randomizer1.min%20%3D%200%3B%0A%09randomizer1.max%20%3D%201%3B%0A%0A%09randomizer2.interval%20%3D%200.5%3B%0A%09randomizer2.min%20%3D%200%3B%0A%09randomizer2.max%20%3D%201%3B%0A%0A%09wave1.length%20%3D%201%3B%0A%09wave1.type%20%3D%20WAVE_SINE%3B%0A%09wave1.min%20%3D%200%3B%0A%09wave1.max%20%3D%201%3B%0A%09wave1.offset%20%3D%200%3B%0A%0A%09wave2.length%20%3D%200.25%3B%0A%09wave2.type%20%3D%20WAVE_SINE%3B%0A%09wave2.min%20%3D%200%3B%0A%09wave2.max%20%3D%201%3B%0A%09wave2.offset%20%3D%200%3B%0A%0A%09led1.light.connect(randomizer2.out)%3B%0A%09led1.place%20%3D%20RE%3B%0A%0A%09led2.light.connect(randomizer1.out)%3B%0A%09led2.place%20%3D%20LE%3B%0A%0A%09servoMotor1.position.connect(wave1.out)%3B%0A%09servoMotor1.place%20%3D%20SERVO_MOTOR_1%3B%0A%0A%09servoMotor2.position.connect(wave2.out)%3B%0A%09servoMotor2.place%20%3D%20SERVO_MOTOR_2%3B%0A%7D%0A%0Avoid%20loop()%7B%0A%0A%7D%0A'
]


var _request = function(url){
	return function(){
		var payload = arguments;
		var promise = function(resolve, reject){
			var headers = {}

			var start = Date.now();
			$.ajax({
				url: url,
				success : function (e, status, req) {
					var end = Date.now();
					var _e = e;
					if(! getParameterByName('text')){
						_e = JSON.stringify(e,null, "\t");
					}
					if(!getParameterByName('silent')){
						console.log('%cREQUEST', 'background: #0A0; color: #fff');
						console.log(url);
						console.log('%clatency: ' + (end - start), 'color: #999');
						console.log(_e)
					}

					resolve(e)

				},
				error: function (e, status, req) {
					var end = Date.now();
					var _e = e;
					if(! getParameterByName('text')){
						_e = JSON.stringify(e,null, "\t");
					}
					if(!getParameterByName('silent')){
						console.log('%cREQUEST', 'background: #A00; color: #fff');
						console.log(url);
						console.log('%clatency: ' + (end - start), 'color: #999');
						console.log(_e)
					}
					resolve(e)
				}
			});
		}
		return new Promise(promise);
	}

}
var request = function(url, instant){
	return function(){
		var payload = arguments;

		var promise = function(resolve, reject){
			pass()
			.then(_request(url))
			.then(function(){
				if(!instant) resolve.apply(null, arguments)
			})

			if(instant) resolve.apply(null, payload)
		}
		return new Promise(promise);
	}

}
var requestProgramCycle = 0
var requestProgram = function(url, instant){
	return function(){
		requestProgramCycle++
		var promise = function(resolve, reject){
			pass()
			.then(request(url + PROGRAMS[requestProgramCycle % PROGRAMS.length], instant))
			.then(resolve)
		}
		return new Promise(promise);
	};
}
var requestProgramCC = function(instant){

	return function(){
		var payload = arguments;

		var promise = function(resolve, reject){
			pass()
			.then(requestProgram((getParameterByName('s') || SERVER), instant))
			.then(resolve)
		}
		return new Promise(promise);
	};
}
var requestResult = function(id, instant){
	return function(){

		var promise = function(resolve, reject){
			pass()
			.then(request((getParameterByName('s') || SERVER) + '/i' + id, instant))
			.then(resolve)
		}
		return new Promise(promise);
	};
}
var requestResultFromResponse = function(instant){
	return function(response){
		var promise = function(resolve, reject){
			if(!response._id){
				return reject('fail')
			}
			pass()
			.then(requestResult(response._id, instant))
			.then(resolve)
		}
		return new Promise(promise);
	};
}
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
var pass = function(){
	var payload = arguments;
	var promise = function(resolve, reject){
		resolve.apply(null, payload);
	}
	return new Promise(promise);
}
var log = function(){
	var payload = arguments;
	var promise = function(resolve, reject){
		for (var i = 0; i < payload.length; i++) {
			console.log(payload[i])
		};
		resolve.apply(null, payload);
	}
	return new Promise(promise);
}
var delay = function(millis){
	return function(){
		var payload = arguments;
		var promise = function(resolve, reject){
			setTimeout(function(){
				resolve.apply(null, payload);
			}, millis)

		}
		return new Promise(promise);
	}
}
