uniform vec4 user_position;
uniform float y_angle;
uniform float y;

int n_plans = 6;
int n_spheres = 4;
float r = 250.0;

vec4 plans[20];
vec4 spheres[50];
float epsilon = 0.0000004;
vec3 light_pos = vec3(0.0, 1000.0, 0.0);
float intensity = 800000.0;

float rand(vec2 co)
{
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec2 xy_pix = gl_FragCoord.xy;
float blur1 = rand(xy_pix);
float blur2 = rand(xy_pix.xy*blur1);
float blur3 = rand(xy_pix.xy*blur2);

vec3 rand_vec = vec3(blur1, blur2, blur3)*25.0;

struct ray_state
{
	vec4 color;
	vec4 origin_color;
	vec3 reflected_ray;
	vec4 contact_point;
	bool contact;
	float reflect_coeff;
};

vec4 intersectSoil(vec3 p, vec3 v, vec4 soil)
{
	vec4 intersection_point = vec4 (0, 0, 0, -1);
	
	float denom = soil.x*v.x + soil.y*v.y + soil.z*v.z;
	float t = 0.0;
	
	if (denom != 0.0) 
	{
		t = -(soil.x*p.x + soil.y*p.y + soil.z*p.z + soil.w)/denom;
		if (t>0.0) intersection_point = vec4(t*v.x+p.x, t*v.y+p.y, t*v.z+p.z, t);
	}
	
	return intersection_point;
}

vec4 intersectSphere(vec3 p, vec3 v, vec4 sphere)
{
	vec4 intersection_point = vec4 (0, 0, 0, -1);
	
	float a0 = p.x - sphere.x;
	float b0 = p.y - sphere.y;
	float c0 = p.z - sphere.z;
	
	float a = (v.x*v.x+v.y*v.y+v.z*v.z);
	float b = 2.0*(a0*v.x+b0*v.y+c0*v.z);
	float c = a0*a0+b0*b0+c0*c0-sphere.w*sphere.w;
	
	float delta = b*b-4.0*a*c;
	
	float t=0.0;
	if (delta > 0.0) 
	{
		float sqrt_delta = sqrt(delta);
		t = min((-b-sqrt_delta)/(2.0*a), (-b+sqrt_delta)/(2.0*a));
		if (t>0.0) intersection_point = vec4(t*v.x+p.x, t*v.y+p.y, t*v.z+p.z, t);
	}
	
	return intersection_point;
}

vec4 getSoilColor(vec3 p)
{
	vec4 color;
	
	if (sin(3.14159*0.02*p.x)*sin(3.14159*0.02*p.z)>0.0)
		color = vec4(0.5, 0.5, 0.5, 1.0);
	else
		color = vec4(0.75);
		
	return color;
}

float getSpecularColor(vec3 p, vec3 normal, vec3 light_pos)
{
	vec3 v_p_light = normalize(light_pos-p);
	float c = dot(v_p_light, normalize(normal));
	if (c>0.0) c = c*c; else c = 0;
	return c;
}

ray_state rayWay(vec3 p, vec3 v)
{
	vec4 final_color = vec4(0.0, 0.0, 0.0, 1.0);
	ray_state ray = ray_state(final_color, vec4(0.0), vec3(0.0), vec4(0.0), false, 0.0);
	
	for (int i=0; i<n_plans; i++)
	{
		vec4 plan_color = vec4(0.99, 1.0, 0.99, 1.0);
		/*if (i==2) plan_color = vec4(1.0);
		else if (i==1) plan_color = vec4(0.1, 1.0, 0.1, 1.0);
		else if (i==0) plan_color = vec4(0.1, 0.1, 1.0, 1.0);
		else if (i==3) plan_color = vec4(1.0, 0.1, 0.1, 1.0);*/
		
		vec4 current_plan = plans[i];
		vec4 intersect_soil = intersectSoil(p, v, current_plan);	
		vec3 normal;
		vec3 reflected_ray;
		if (intersect_soil.w > 0.0)
		{	
			normal = current_plan.xyz;
		
			vec3 reflected_ray = reflect(v, normal);
			float dist_light = distance(light_pos, intersect_soil.xyz);
			float coeff = intensity/(dist_light*dist_light);
			
			float shadow_coeff = 1;
			for (int i=0; i<n_spheres; i++)
			{	
				vec4 intersect_sphere = intersectSphere(intersect_soil.xyz, light_pos-intersect_soil.xyz, spheres[i]);
				if (intersect_sphere.w > 0.0 && dot(light_pos-intersect_soil.xyz, light_pos-spheres[i].xyz) > 0) shadow_coeff = 0.3;
			}
			
			final_color = coeff*getSpecularColor(intersect_soil.xyz, normal, light_pos)*shadow_coeff*(plan_color*getSoilColor(intersect_soil.xyz));
			
			if (intersect_soil[3]<ray.contact_point.w || ray.contact_point.w == 0.0)
				ray = ray_state(final_color, plan_color, reflected_ray, intersect_soil+epsilon*vec4(reflected_ray, 0), true, 0.75);
		}
	}
	
	for (int i=0; i<n_spheres; i++)
	{
		vec4 sphere_color;
		if (i%5==0) sphere_color = vec4(1.0);
		else if (i%5==1) sphere_color = vec4(1.0, 0.1, 0.1, 1.0);
		else if (i%5==2) sphere_color = vec4(0.1, 1.0, 0.1, 1.0);
		else if (i%5==3) sphere_color = vec4(0.1, 0.1, 1.0, 1.0);
		else if (i%5==4) sphere_color = vec4(1.0, 0.0, 1.0, 1.0);
		
		vec4 current_sphere = spheres[i];
		vec4 intersect_sphere = intersectSphere(p, v, current_sphere);
		if (intersect_sphere.w > 0.0)
		{
			vec3 reflected_ray;
			vec3 normal = intersect_sphere.xyz-current_sphere.xyz;			
			reflected_ray = reflect(v, normal);
			float dist_light = distance(light_pos, intersect_sphere.xyz);
			float coeff = intensity/(dist_light*dist_light);
			
			float shadow_coeff = 1;
			for (int i=0; i<n_spheres; i++)
			{	
				vec4 intersect_sphere2 = intersectSphere(intersect_sphere.xyz, light_pos-intersect_sphere.xyz, spheres[i]);
				if (intersect_sphere2.w > 0.0) 
				{
					shadow_coeff = 0.0;
					break;
				}
			}
			
			float specular = max(0.0, pow(dot(normalize(-reflected_ray), normalize(v)), 250.0));
			final_color = coeff*shadow_coeff*getSpecularColor(intersect_sphere.xyz, normal, light_pos)*(sphere_color+specular*vec4(1.0));
			
			if (intersect_sphere.w<ray.contact_point.w || ray.contact_point.w == 0.0)
				ray = ray_state(final_color, sphere_color, reflected_ray, intersect_sphere, true, 1.0);
		}
	}
	
	return ray;
}

void main()
{	
	for (int i=0; i<n_spheres; i++)
	{
		float a = 2*3.14159/(n_spheres)*i;
		spheres[i] = vec4(300*cos(a+y*0.1), 300.0*sin(a+y*0.1)+250, 0.0, 100.0);
	}
	
	//spheres[n_spheres-1] = vec4(user_position.xyz-vec3(0, 0, 768), 75);
	
	float angle = user_position.w;	
	float h = 900.0;
	plans[0] = vec4(0, 1, 0, 100.0);
	plans[5] = vec4(0, -1, 0, 2000);
	plans[3] = vec4(0, 1, 0, 100);
	plans[1] = vec4(0, 0, -1, h);
	plans[4] = vec4(0, 0, 1, h);
	plans[2] = vec4(-1, 0, 0, h);
	plans[0] = vec4(1, 0, 0, h);
	
	vec4 final_color = vec4(0.0);
	vec3 view_origin = vec3(user_position.x, user_position.y, user_position.z-768.0);
	vec2 screen_vec = gl_FragCoord.xy;
	
	vec3 current_vector = vec3(screen_vec.x-512, screen_vec.y-384, 0.0)-vec3(0.0, 0.0, -768.0);
	
	float sin_a = sin(angle);
	float cos_a = cos(angle);
	float sin_a_y = sin(-y_angle);
	float cos_a_y = cos(-y_angle);
	
	current_vector = vec3(current_vector.x, current_vector.y*cos_a_y-current_vector.z*sin_a_y, current_vector.y*sin_a_y+current_vector.z*cos_a_y);
	current_vector = vec3(current_vector.x*cos_a-current_vector.z*sin_a, current_vector.y, current_vector.x*sin_a+current_vector.z*cos_a);
	
	float n_bounds = 4.0;
	vec3 start_point = view_origin;
	ray_state ray = rayWay(start_point, current_vector);
	final_color = ray.color;
	vec4 o_color = ray.origin_color*ray.reflect_coeff;
	
	for (int i=1; i<n_bounds; i++)
	{
		if (ray.contact) 
		{
			vec3 contact_pt = ray.contact_point.xyz;
			float R0 = 0.2;
			vec3 L = light_pos-contact_pt;
			vec3 V = view_origin-contact_pt;
			float H = max(dot(normalize(L), normalize(V)), 0.0);
			float F = R0+(1.0-R0)*pow(1.0-H, 3.0);
			
			current_vector = ray.reflected_ray;
			start_point = contact_pt;
			ray = rayWay(ray.contact_point.xyz, ray.reflected_ray);
			final_color = final_color + F*ray.color*o_color;
			o_color *= ray.origin_color*ray.reflect_coeff;
		}
	}
	
	gl_FragColor = final_color;
}

