import { api, LightningElement, track, wire } from 'lwc';
import { getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getPicklistValuesByRecordType, getObjectInfo } from 'lightning/uiObjectInfoApi';

const fields = [];
var DUMMY_RECORDTYPE_ID = '012000000000000AAA';

export default class PathComponent extends LightningElement {

    @api recordId; /* Id the record */
    @api objectApiName; /* object api name. For example, Account, Invoice__c */
    @api fieldApiName; /* field api name. For example, Rating, Status__c */
    @api values; /* picklist values comma separated if the values are not part of picklist field */
    @api currentValue; /* current value of the field */
    pathType='path'; /* type of the path. For base, path */
    @api buttonLocation; /* location of the button. For top, same row */
    @api buttonLabel = 'Update Current Value'; /* label of the button */
    @api showButton = false;
    @api recordTypeName; /* record type name */
    @track openModal;
    @track closedStatus='';

    @track pathValues = [];
    isLoading = false;
    isTop = false;
    errorMessage;
    isError = false;
    

    recordTypeId;

    get options() {
        return [
            { label: 'UnQualified', value: 'UnQualified' },
            { label: 'Disqualified', value: 'Disqualified' },
            { label: 'Not Responsive', value: 'Not Responsive' },
            { label: 'Not Interested', value: 'Not Interested' }
        ];
    }

    connectedCallback() {

        fields.push(this.objectApiName+'.'+this.fieldApiName);
        if(this.recordTypeName){
            fields.push(this.objectApiName+'.RecordTypeId');
        }
        if(this.values){
            let allValues = this.values.split(',');
            for(let i=0; i<allValues.length; i++){
                this.pathValues.push({
                    label : allValues[i],
                    value : allValues[i]
                });
            }
        }else{
            //this.handlePicklistValues();
        }
    }

    /* get the current value for the piklist field */
    @wire(getRecord, { recordId: '$recordId', fields })
    getfieldValue({error, data}){

        if(data){
            let fieldValue    = getFieldValue(data, this.objectApiName+'.'+this.fieldApiName);
            this.recordTypeId = getFieldValue(data, this.objectApiName+'.RecordTypeId');
            if(!this.currentValue){
                let closedStatus=['UnQualified','Disqualified','Not Responsive','Not Interested'];
               if(closedStatus.includes(fieldValue))
               {
                  this.currentValue='Closed'; 
               }
               else
               {
                this.currentValue = fieldValue;
               }
                
            }
            if(this.recordTypeId){
                //DUMMY_RECORDTYPE_ID = this.recordTypeId;
            }else{
                this.recordTypeId = DUMMY_RECORDTYPE_ID;
            }

        }else if(error){
            this.isError = true;
            this.errorMessage = error.body.message;
        }
    }

    @wire(getPicklistValuesByRecordType, { objectApiName: '$objectApiName', recordTypeId: '$recordTypeId' })
    fetchValues({error, data}){
        if(data && data.picklistFieldValues){
            try{
                if(!this.values){ // check if the values are not there then add the values to the picklist
                    let allValues = data.picklistFieldValues[this.fieldApiName];
                    this.pathValues = [];
                    allValues.values.forEach(option  => {
                        this.pathValues.push({
                            label : option.label,
                            value : option.value
                        });
                    });
                }
            }catch(err){
                this.isError = true;
                this.errorMessage = err.message;
            }
        }else if(error){
            this.isError = true;
            this.errorMessage = 'Object is not configured properly please check';
        }
    }


    optionSelected(event)
    {
        
        this.openModal=false;

    }

    optionChanged(event)
    {
        let value = event.detail.value;
        this.newValue = value;
        console.log(this.currentValue);

    }
    handleSelectChange(event){
     
        //event.preventDefault();
        this.currentValue = event.target.value;
        console.log(this.currentValue);
        if(this.currentValue==='Closed')
        {
            this.openModal=true;
        }


        
        if(!this.showButton){
            const changeEvent = new CustomEvent('change', {
                detail: {
                    value : this.currentValue
                }
            });
            this.dispatchEvent(changeEvent);
        }
    }

    handleClick(event){
        event.preventDefault();
        this.isLoading = true;
        const fields = {};
        fields['Id'] = this.recordId; //ID_FIELD.fieldApiName

     
        console.log('printing new value',this.newValue);
        console.log('printing current ');
        if(this.newValue)
        {
            fields[this.fieldApiName] = this.newValue; 
       }
       else
       {
        fields[this.fieldApiName] = this.currentValue; 
       }
         // STAGENAME_FIELD.fieldApiName
        const recordInput = { fields };
        updateRecord(recordInput)
        .then(() => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Record updated',
                    variant: 'success'
                })
            );
        })
        .catch(error => {
            console.error(' Error updating record ', error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error updating record',
                    message: error.body.message,
                    variant: 'error'
                })
            );
        })
        .finally(() => {
            this.isLoading = false;
        });
    }
}