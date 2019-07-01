#version 150
//#extension GL_ARB_shading_language_420pack : require
#extension GL_ARB_explicit_attrib_location : require

#define TASK 10
#define ENABLE_OPACITY_CORRECTION 0
#define ENABLE_LIGHTNING 0
#define ENABLE_SHADOWING 0

in vec3 ray_entry_position;

layout(location = 0) out vec4 FragColor;

uniform mat4 Modelview;

uniform sampler3D volume_texture;
uniform sampler2D transfer_texture;


uniform vec3    camera_location;
uniform float   sampling_distance;
uniform float   sampling_distance_ref;
uniform float   iso_value;
uniform vec3    max_bounds;
uniform ivec3   volume_dimensions;

uniform vec3    light_position;
uniform vec3    light_ambient_color;
uniform vec3    light_diffuse_color;
uniform vec3    light_specular_color;
uniform float   light_ref_coef;


bool
inside_volume_bounds(const in vec3 sampling_position)
{
        return (all(greaterThanEqual(sampling_position, vec3(0.0)))
                && all(lessThanEqual(sampling_position, max_bounds)));
}


float
get_sample_data(vec3 in_sampling_pos)
{
        vec3 obj_to_tex = vec3(1.0) / max_bounds;
        return texture(volume_texture, in_sampling_pos * obj_to_tex).r;
}

void main()
{
        /// One step trough the volume
        vec3 ray_increment  = normalize(ray_entry_position - camera_location) * sampling_distance;
        /// Position in Volume
        vec3 sampling_pos = ray_entry_position + ray_increment; // test, increment just to be sure we are in the volume

        /// Init color of fragment
        vec4 dst = vec4(0.0, 0.0, 0.0, 0.0);

        /// check if we are inside volume
        bool inside_volume = inside_volume_bounds(sampling_pos);
        
        if (!inside_volume)
                discard;

        #if TASK == 10
        vec4 max_val = vec4(0.0, 0.0, 0.0, 0.0);
        
        // the traversal loop,
        // termination when the sampling position is outside volume boundarys
        // another termination condition for early ray termination is added
        while (inside_volume) 
        {      
                // get sample
                float s = get_sample_data(sampling_pos);
                        
                // apply the transfer functions to retrieve color and opacity
                vec4 color = texture(transfer_texture, vec2(s, s));
                
                // this is the example for maximum intensity projection
                max_val.r = max(color.r, max_val.r);
                max_val.g = max(color.g, max_val.g);
                max_val.b = max(color.b, max_val.b);
                max_val.a = max(color.a, max_val.a);
                
                // increment the ray sampling position
                sampling_pos  += ray_increment;

                // update the loop termination condition
                inside_volume  = inside_volume_bounds(sampling_pos);
                }

        dst = max_val;
#endif 

#if TASK == 11

        int count = 0;
        float sum_sample = 0 ;
        float avg_val;
        
        // the traversal loop,
        // termination when the sampling position is outside volume boundarys
        // another termination condition for early ray termination is added
        while (inside_volume)
        {
            count++;
            
            // get sample
            float sample = get_sample_data(sampling_pos);
            sum_sample += sample;
            
            // increment the ray sampling position
            sampling_pos += ray_increment;
            
            // update the loop termination condition
            inside_volume = inside_volume_bounds(sampling_pos);
        }
        // Compute avg of s and then assign dst = color
        avg_val = sum_sample / count;
        
        // apply the transfer functions to retrieve color and opacity
        vec4 color = texture(transfer_texture, vec2(avg_val, avg_val));
        dst = color;
#endif

#if TASK == 12 

        // store starting & end point afor binary search
        vec3 start_point = sampling_pos;
        vec3 end_point = sampling_pos;
        
        // the traversal loop,
        // termination when the sampling position is outside volume boundarys
        // another termination condition for early ray termination is added
        while (inside_volume)
        {
            // get sample
            float s = get_sample_data(sampling_pos);
                
            //------------------------------------
            // apply the transfer funcxtion to retrieve color & opacity
            vec4 color = texture(transfer_texture, vec2(s, s));
            if (color.r >= iso_value
                && color.g >= iso_value
                && color.b >= iso_value
                && color.a >= iso_value)
            {
                dst = color;
                // stop
                break;
            }
            end_point = sampling_pos;
            //------------------------------------

            // increment the ray sampling position
            sampling_pos += ray_increment;
            
            #if ENABLE_LIGHTNING == 1 // Add Shading
                IMPLEMENTLIGHT;
                #if ENABLE_SHADOWING == 1 // Add Shadows
                        IMPLEMENTSHADOW;
                #endif
            #endif
            
            // update the loop termination condition
            inside_volume = inside_volume_bounds(sampling_pos);
        }
#endif

#if TASK == 13
        // store starting & end point afor binary search
        vec3 start_point = sampling_pos;
        vec3 end_point = sampling_pos;

        bool found = false;
        inside_volume = inside_volume_bounds(start_point);
        
        // the traversal loop,
        // termination when the sampling position is outside volume boundarys
        // another termination condition for early ray termination is added
        while (inside_volume && !found)
        {
            // point between start & end
            vec3 mid_point = normalize(end_point - start_point) / 2;
            
            // get sample
            float s = get_sample_data(sampling_pos);
            
            // apply the transfer functions to retrieve color and opacity
            vec4 color = texture(transfer_texture, vec2(s, s));
            
            if (color.r >= iso_value
            && color.g >= iso_value
            && color.b >= iso_value
            && color.a >= iso_value)
            {
                dst = color;
                found = true;
            } else {
                // divide the half to 2 & update inside volume
                start_point = normalize(end_point - mid_point) / 2;
                inside_volume = inside_volume_bounds(start_point);
            }
        }
#endif


#if TASK == 31
        // the traversal loop,
        // termination when the sampling position is outside volume boundarys
        // another termination condition for early ray termination is added
        while (inside_volume)
        {
                // get sample
        #if ENABLE_OPACITY_CORRECTION == 1 // Opacity Correction
                IMPLEMENT;
        #else
                float s = get_sample_data(sampling_pos);
        #endif
                // dummy code
                dst = vec4(light_specular_color, 1.0);

                // increment the ray sampling position
                sampling_pos += ray_increment;

        #if ENABLE_LIGHTNING == 1 // Add Shading
                IMPLEMENT;
        #endif

                // update the loop termination condition
                inside_volume = inside_volume_bounds(sampling_pos);
        }
#endif 

        // return the calculated color value
        FragColor = dst;
}

