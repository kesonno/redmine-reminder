var USER_PRESSED_YES = 0;
var USER_PRESSED_NO = 1;
var cfg = require('./config');
var exec = require('child_process').exec;
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
// to log something: require("sys").puts("error");

Date.prototype.getWeek = function() {
    var onejan = new Date(this.getFullYear(),0,1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay()+1)/7);
}

var redmine = require('http').createClient(80, cfg.getConfig().host);
var requestHeaders = {
  'host': cfg.getConfig().host,
  'Authorization': 'Basic ' + new Buffer(cfg.getConfig().redmineuser + ':' + cfg.getConfig().redminepass).toString('base64')
};

//retrieve all user assigned open issues
var reqIssues = redmine.request('GET', '/issues.xml?assigned_to_id=me', requestHeaders);
var issuesListTemplate = '/usr/bin/zenity --list --width=600 --height=500 --title="Elenco delle issue che ti sono assegnate" --column="#" --column="Progetto" --column="Titolo" ';
reqIssues.on('response', function(response) {
	response.setEncoding('utf8');
	var body = "";
	response.on('data', function(chunk) {
		body += chunk;
	}).on('end', function() {
		parser.on('end', function(result) {
			//build the issue list
			issuesList = issuesListTemplate;
			var issues = result.issue;
			for (var i in issues) {
				//remove double quotes since are use by zenity
				issuesList += issues[i].id + ' "' + issues[i].project['@'].name + '" "' + issues[i].subject.replace(/\"/g, "") + '" ';
			}
			//show the list
			child = exec(issuesList, function(error, stdout, stderr) {
				var issueId = stdout.replace("\n", "");
				if(issueId===''){
					return;
				}

				exec('/usr/bin/zenity --question --text "Vuoi loggare un\'ora sul task '+issueId+'?"; echo $?', function(error, stdout, stderr){

                    var today = new Date();
                    var curdate = today.getYear()+"-"+today.getMonth()+"-"+today.getDay();
                    var year = today.getYear();
                    var month = today.getMonth();
                    var week = today.getWeek();                    

					if(userChoice(stdout)==USER_PRESSED_NO){
                        require("sys").puts("half an hour");
						exec('/usr/bin/zenity --question --text "Vuoi loggare mezz\'ora sul task '+issueId+'?"; echo $?', function(error, stdout, stderr){
							if(userChoice(stdout)==USER_PRESSED_NO){
								return;
							}
							
							exec('mysql -u'+cfg.getConfig().dbuser+' -p'+cfg.getConfig().dbpass+' -h '+cfg.getConfig().dbhost+' '+cfg.getConfig().dbname+
									' -e "SELECT project_id FROM issues WHERE id = '+issueId+'"',function(error, stdout, stderr){
								var projectId = stdout.replace("\n", "").replace("project_id", "");
								var query = 'mysql -u'+cfg.getConfig().dbuser+' -p'+cfg.getConfig().dbpass+' -h '+cfg.getConfig().dbhost+' '+cfg.getConfig().dbname+
											' -e "INSERT INTO time_entries(project_id, user_id, issue_id, hours, comments, activity_id, spent_on, tyear, tmonth, tweek, created_on, updated_on) '+ 
											'VALUES('+projectId+', 22, '+issueId+', 0.5, \'generated from rmr script\', 9, '+curdate+', '+year+', '+month+', '+week+', '+curdate+', '+curdate+')"';
								exec(query, function(error, stdout, stderr){
                                    require("sys").puts(error);
                                });
							});
						});
					}
					if(userChoice(stdout)==USER_PRESSED_YES){
						exec('mysql -u'+cfg.getConfig().dbuser+' -p'+cfg.getConfig().dbpass+' -h '+cfg.getConfig().dbhost+' '+cfg.getConfig().dbname+
									' -e "SELECT project_id FROM issues WHERE id = '+issueId+'"',function(error, stdout, stderr){
							var projectId = stdout.replace("\n", "").replace("project_id", "");
    						var query = 'mysql -u'+cfg.getConfig().dbuser+' -p'+cfg.getConfig().dbpass+' -h '+cfg.getConfig().dbhost+' '+cfg.getConfig().dbname+
										' -e "INSERT INTO time_entries(project_id, user_id, issue_id, hours, comments, activity_id, spent_on, tyear, tmonth, tweek, created_on, updated_on) '+ 
										'VALUES('+projectId+', 22, '+issueId+', 1, NULL,9, '+curdate+', '+year+', '+month+', '+week+', '+curdate+', '+curdate+')"';
							exec(query, function(error, stdout, stderr){
                                //require("sys").puts(error);    
                            });
						});
					}
				});
			});
		}).parseString(body);
    });
}).end();

function userChoice(stdout){
	return stdout.replace("\n", "");
}
