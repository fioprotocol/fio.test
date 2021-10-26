var http = require('http');

const data = JSON.stringify({
  json: true,
  code: 'fio.staking',
  scope: 'fio.staking',
  table: 'staking',
  limit: 10,
  reverse: true,
  show_payer: false
})

//var post_data = JSON.stringify(json);

var options = {
  host: 'localhost',
  path: '/v1/chain/get_table_rows',
  //since we are listening on a custom port, we need to specify it by hand
  port: '8889',
  //This is what changes the request to a POST request
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': data.length
  }
};

callback = function (response) {
  var str = ''
  response.on('data', function (chunk) {
    str += chunk;
  });

  response.on('end', function () {
    console.log(str);
  });
}

var req = http.request(options, callback);
//This is the data we are posting, it needs to be a string or a buffer
req.write(data);
req.end();