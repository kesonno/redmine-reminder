// Credenziali di accesso a Redmine
var cfg = require('./config');

// Modulo utilizzato per lanciare l'eseguibile di Zenity
var exec = require('child_process').exec;

// Parser per le risposte xml
var xml2js = require('xml2js');
var parser = new xml2js.Parser();

// Client per le richieste al server
var redmine = require('http').createClient(80, 'tracker.nextre.it');

// Header per le richieste al tracker
var requestHeaders = {
  'host': 'tracker.nextre.it',
  'Authorization': 'Basic ' + new Buffer(cfg.getConfig().user + ':' + cfg.getConfig().pass).toString('base64')
};

// Recupero tutte le issue aperte e assegnate all'utente
var reqIssues = redmine.request('GET', '/issues.xml?assigned_to_id=me', requestHeaders);

var issuesListTemplate = '/usr/bin/zenity --list --width=600 --height=500 --title="Elenco delle issue che ti sono assegnate" --column="#" --column="Progetto" --column="Titolo" ';

reqIssues.on('response', function(response) {
	
  response.setEncoding('utf8');

  // Recupero tutto l'esito della richiesta,
  // al termine processo la risposta
  var body = "";
  response.on('data', function(chunk) {
    body += chunk;
  }).on('end', function() {
    parser.on('end', function(result) {
      // Compongo la lista delle issue
      issuesList = issuesListTemplate;
      var issues = result.issue;
      for (var i in issues) {
        // Strippo via i doppi apici poiché sono usati da Zenity come enclosure
        issuesList += issues[i].id + ' "' + issues[i].project['@'].name + '" "' + issues[i].subject.replace(/\"/g, "") + '" ';
      }

      // Mostra la lista
      child = exec(issuesList, function(error, stdout, stderr) {
    	  var issueId = stdout.replace("\n", "");
    	  exec('/usr/bin/zenity --question --text "Vuoi loggare un\'ora sul task '+issueId+'?"; echo $?', function(error, stdout, stderr){
		      if(stdout.replace("\n", "")===0){
		    	  //user pressed yes 
		    	  exec('curl -v -H "Content-Type:text.json" -X PUT --data \'{"spent_time": "3.0"}\' -u cfg.getConfig().user:cfg.getConfig().pass http://tracker.nextre.it/issues/'+issueId+'.json', function(error, stdout, stderr){});
		      }
    	  });
      });
    }).parseString(body);
  });
}).end();
