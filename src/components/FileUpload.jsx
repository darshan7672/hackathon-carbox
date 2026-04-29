import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function FileUpload({ onUpload }) {
    const [file, setFile] = useState(null);

    const handleUpload = async () => {
        if (!file) return alert("Select a file");

        const filePath = `reports/${Date.now()}-${file.name}`;

        const { data, error } = await supabase.storage
            .from("soil-reports")
            .upload(filePath, file);

        if (error) {
            console.error(error);
            alert("Upload failed");
        } else {
            alert("Uploaded successfully!");
            onUpload(filePath); // send path to parent
        }
    };

    return (
        <div>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} />
            <button onClick={handleUpload}>Upload Report</button>
        </div>
    );
}