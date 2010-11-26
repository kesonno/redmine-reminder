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
  'Authorization': 'Basic ' + new Buffer('gennaro.vietri:270583').toString('base64')
};

// Recupero tutte le issue aperte e assegnate all'utente
var reqIssues = redmine.request('GET', '/issues.xml?assigned_to_id=me&status_id=open', requestHeaders);

// Template per generare la lista con Zenity
var issuesListTpl = '/usr/bin/zenity --list --width=600 --height=500 --title="Elenco delle issue che ti sono assegnate" --column="#" --column="Progetto" --column="Titolo" ';

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
      issuesList = issuesListTpl;
      var issues = result.issue;
      for (var i in issues) {
        // Strippo via i doppi apici poiché sono usati da Zenity come enclosure
        issuesList += issues[i].id + ' "' + issues[i].project['@'].name + '" "' + issues[i].subject.replace(/\"/g, "") + '" ';
      }

      // Mostra la lista
      child = exec(issuesList, function(error, stdout, stderr) {});
    }).parseString(body);
  });
}).end();
