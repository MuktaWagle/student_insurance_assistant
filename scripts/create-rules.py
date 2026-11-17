import json
rules=[]
def add(id,title,text,source,page,anchor,modes=['care','claim'],kind='step',setting=None,condition=None):
 r=dict(id=id,title=title,text=text,sourceId=source,page=page,anchor=anchor,modes=modes,kind=kind)
 if setting:r['setting']=setting
 if kind=='document':r['requirement']='conditional' if condition else 'required'
 if condition:r['condition']=condition
 rules.append(r)
add('uhc','University Health Centre','UHC is at 20 Lower Kent Ridge Road, Level 1, Singapore 119080. Contact the clinic at +65 6601 5035.','UHC_PanelClinic_Info',3,'20 Lower Kent Ridge Road',['care'],'care')
add('eligibility','Check your student status','The overview includes full-time students and part-time cohorts from AY2026/27, except part-time CPE. Confirm individual eligibility and Health Service Fees before relying on benefits.','Student_Insurance_Overview',1,'part time students')
add('status','Check fees and active enrolment','Cover can cease with changed enrolment status or unpaid premiums. Leave of absence has limited, conditional provisions; ask NUS to confirm individual applicability.','si-important-notes',1,'not paid the insurance premium')
add('submit','Submit through IHP','For the insurer claims described in the factsheets, use the IHP OneConnect app or portal. UHC scheme claims use a separate route; do not assume every claim goes to IHP.','si-claims',1,'IHP ONECONNECT',['claim'])
add('originals','Keep your originals','Keep original invoices and receipts for one year from treatment and provide them if the insurer requests them.','si-claims',1,'Original invoices',['care','claim'])
add('uhc-route','UHC scheme claim route','The University Health Scheme section directs claims to the UHC Admin Office within 30 days of treatment. Confirm which scheme applies before submitting.','Student_Insurance_Overview',2,'Admin Office',['claim'],setting='uhc')
for setting,source,page in [('specialist','Factsheet_outpatientspecialistinsurance',2),('hospital','Factsheet_hospitalisationandsurgicalinsurance',1),('accident','Factsheet_grouppersonalaccident',2)]:
 add(setting+'-procedure','Claim procedure','Use the claim procedure and supporting-document table for this scheme. The insurer may request more information.','%s'%source,page,'Claim Procedure',['care','claim'],setting=setting)
 def doc(id,title,anchor,condition=None):add(setting+'-'+id,title,title+'.',source,page,anchor,['care','claim'],'document',setting,condition)
 if setting=='specialist':
  doc('invoice','Medical invoices with details of treatment','Medical Invoices')
  doc('referral','Referral letter','Referral Letter')
  doc('memo',"Doctor’s memo",'octor’s Memo','If initial treatment started before joining NUS')
  doc('settlement',"Previous insurer’s settlement letter/email",'Settlement','If initial treatment started before 1 August 2022')
 elif setting=='hospital':
  doc('invoice','Final hospital invoice','Final Hospital Invoice','For a claim without a Letter of Guarantee (LOG)')
  doc('prepost','Pre/post hospitalisation or surgery invoices','Pre/Post','If claiming pre/post hospitalisation or surgery expenses')
  doc('discharge','Inpatient discharge summary','Inpatient Discharge Summary')
 else:
  doc('invoice','Other medical invoices','Other Medical Invoices','For an outpatient accident claim')
  doc('hospital','Final hospital invoice and inpatient discharge summary','Final Hospital Invoice','For a hospitalisation/surgery accident claim')
  doc('prepost','Pre/post hospitalisation or surgery invoices','Pre/Post','For relevant hospitalisation/surgery accident expenses')
 doc('receipt','Payment receipt','Payment Receipt','If the invoice shows payment is due'+ ('; with LOG, for pre/post expenses' if setting=='hospital' else ''))
 if setting!='specialist':doc('referral','Referral letter or A&E memo','Referral Letter','If any; hospital checklist specifies claims without LOG')
 doc('reports','Written test reports','Written Test Reports','If any; hospital checklist specifies claims without LOG')
 if setting!='hospital':doc('order','Test order form','Test Order Form','If any')
 doc('police','Police report','Police Report','For road traffic accidents; hospital checklist specifies claims without LOG')
 doc('overseas','Medical report','Medical Report','For overseas treatment; hospital checklist specifies claims without LOG')
json.dump(rules,open('policy/rules.json','w'),indent=2,ensure_ascii=False)
