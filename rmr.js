var cfg = require('./config');

// Modulo utilizzato per lanciare l'eseguibile di Zenity
var exec = require('child_process').exec;

// Parser per le risposte xml
var xml2js = require('xml2js');
var parser = new xml2js.Parser();

// Client per le richieste al server
var redmine = require('http').createClient(80, cfg.getConfig().host);

// Header per le richieste al tracker
var requestHeaders = {
  'host': cfg.getConfig().host,
  'Authorization': 'Basic ' + new Buffer(cfg.getConfig().redmineuser + ':' + cfg.getConfig().redminepass).toString('base64')
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
              if(stdout.replace("\n", "")==0){
		    	  //user pressed yes 
                  exec('mysql -u'+cfg.getConfig().dbuser+' -p'+cfg.getConfig().dbpass+' -h '+cfg.getConfig().dbhost+' '+cfg.getConfig().dbname+' -e "SELECT project_id FROM issues WHERE id = '+issueId+'"',function(error, stdout, stderr){
                  var projectId = stdout.replace("\n", "").replace("project_id", "");
                  var query = 'mysql -u'+cfg.getConfig().dbuser+' -p'+cfg.getConfig().dbpass+' -h '+cfg.getConfig().dbhost+' '+cfg.getConfig().dbname+' -e "INSERT INTO time_entries(project_id, user_id, issue_id, hours, comments, activity_id, spent_on,     tyear, tmonth, tweek, created_on, updated_on) VALUES('+projectId+', 22, '+issueId+', 1, \'generated from rmr script\', 9, \'2010-12-02\', 2010, 12, 48, \'2010-12-02\', \'2010-12-02\')"';
                  exec(query, function(error, stdout, stderr){});
                  });
              }
    	  });
      });
    }).parseString(body);
  });
}).end();
