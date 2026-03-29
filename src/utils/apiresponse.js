class ApiResponse{
    constructor(statuscode=200,data=null,message="request success")
    {
        this.statuscode = typeof statuscode==="number" ? statuscode : Number(statuscode) || 200

        this.data = data===undefined ? null : data

        this.message = typeof message==="string" ? message : String(message)

        this.success= this.statuscode >=200 && this.statuscode <400

    }
    toJSON()
    {
        return {
            success:this.success,
            status:this.statuscode,
            data:this.data,
            message:this.message
        }
    }
}

export {ApiResponse}
export default ApiResponse